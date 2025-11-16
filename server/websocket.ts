import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { parse } from "cookie";
import { storage } from "./storage";
import type { WsMessage, WsEventType } from "@shared/schema";

// Track connected clients
interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  userName: string;
  conversationIds: Set<string>;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ConnectedClient>(); // userId -> client
  private typingTimers = new Map<string, NodeJS.Timeout>(); // userId-conversationId -> timer
  
  // OPTIMIZATION: Cache conversation participants to avoid DB query on every broadcast
  // Cache stores conversationId -> Set<userId> for fast lookups
  private participantCache = new Map<string, Set<string>>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    // Start periodic cache cleanup
    this.startCacheCleanup();

    this.wss.on("connection", async (ws: WebSocket, req) => {
      try {
        // Extract session from cookie
        const cookies = parse(req.headers.cookie || "");
        const sessionId = cookies["connect.sid"];

        if (!sessionId) {
          ws.close(1008, "Authentication required");
          return;
        }

        // Validate session and get user
        const userId = await this.authenticateSession(sessionId);
        if (!userId) {
          ws.close(1008, "Invalid session");
          return;
        }

        // Get user details
        const user = await storage.getUser(userId);
        if (!user) {
          ws.close(1008, "User not found");
          return;
        }

        const userName = user.fullName || user.email;

        // Register client
        const client: ConnectedClient = {
          ws,
          userId,
          userName,
          conversationIds: new Set(),
        };
        this.clients.set(userId, client);

        console.log(`[WebSocket] User connected: ${userName} (${userId})`);

        // Send connection confirmation
        this.sendToClient(userId, {
          type: "connected",
          payload: { userId, userName },
          timestamp: new Date().toISOString(),
        });

        // Broadcast user online status
        this.broadcastPresence(userId, "online");

        // Handle incoming messages
        ws.on("message", async (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as WsMessage;
            await this.handleClientMessage(userId, message);
          } catch (error) {
            console.error("[WebSocket] Error handling message:", error);
            this.sendToClient(userId, {
              type: "error",
              payload: { message: "Invalid message format" },
            });
          }
        });

        // Handle disconnection
        ws.on("close", () => {
          console.log(`[WebSocket] User disconnected: ${userName} (${userId})`);
          this.clients.delete(userId);
          this.broadcastPresence(userId, "offline");
          
          // Clear typing timers
          const keysToDelete: string[] = [];
          this.typingTimers.forEach((timer, key) => {
            if (key.startsWith(userId + "-")) {
              clearTimeout(timer);
              keysToDelete.push(key);
            }
          });
          keysToDelete.forEach(key => this.typingTimers.delete(key));
        });

        // Handle errors
        ws.on("error", (error) => {
          console.error(`[WebSocket] Error for user ${userId}:`, error);
        });

      } catch (error) {
        console.error("[WebSocket] Connection error:", error);
        ws.close(1011, "Internal server error");
      }
    });

    console.log("[WebSocket] Server initialized on /ws");
  }

  private async authenticateSession(sessionId: string): Promise<string | null> {
    try {
      // Extract session ID (remove "s:" prefix if present)
      const cleanSessionId = sessionId.startsWith("s:") 
        ? sessionId.slice(2).split(".")[0] 
        : sessionId;

      // Get session from database
      const session = await storage.getSession(cleanSessionId);
      if (!session) {
        return null;
      }

      // Extract user ID from session
      const userId = session.passport?.user;
      return userId || null;
    } catch (error) {
      console.error("[WebSocket] Session authentication error:", error);
      return null;
    }
  }

  private async handleClientMessage(userId: string, message: WsMessage) {
    const { type, payload } = message;

    switch (type) {
      case "join_conversation":
        await this.handleJoinConversation(userId, payload.conversationId);
        break;

      case "leave_conversation":
        await this.handleLeaveConversation(userId, payload.conversationId);
        break;

      case "typing_start":
        await this.handleTypingStart(userId, payload.conversationId);
        break;

      case "typing_stop":
        await this.handleTypingStop(userId, payload.conversationId);
        break;

      case "mark_read":
        await this.handleMarkRead(userId, payload.conversationId, payload.messageId);
        break;

      default:
        console.warn(`[WebSocket] Unknown message type: ${type}`);
    }
  }

  private async handleJoinConversation(userId: string, conversationId: string) {
    const client = this.clients.get(userId);
    if (!client) return;

    // Verify user is participant
    const isParticipant = await storage.isConversationParticipant(conversationId, userId);
    if (!isParticipant) {
      this.sendToClient(userId, {
        type: "error",
        payload: { message: "Not a conversation participant" },
      });
      return;
    }

    client.conversationIds.add(conversationId);
    console.log(`[WebSocket] User ${userId} joined conversation ${conversationId}`);
  }

  private async handleLeaveConversation(userId: string, conversationId: string) {
    const client = this.clients.get(userId);
    if (!client) return;

    client.conversationIds.delete(conversationId);
    console.log(`[WebSocket] User ${userId} left conversation ${conversationId}`);
  }

  private async handleTypingStart(userId: string, conversationId: string) {
    const client = this.clients.get(userId);
    if (!client || !client.conversationIds.has(conversationId)) return;

    // Clear existing timer
    const timerKey = `${userId}-${conversationId}`;
    const existingTimer = this.typingTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Broadcast typing indicator
    await this.broadcastToConversation(conversationId, userId, {
      type: "user_typing",
      payload: {
        conversationId,
        userId,
        userName: client.userName,
        isTyping: true,
      },
    });

    // Auto-stop typing after 3 seconds
    const timer = setTimeout(() => {
      this.handleTypingStop(userId, conversationId);
    }, 3000);
    this.typingTimers.set(timerKey, timer);
  }

  private async handleTypingStop(userId: string, conversationId: string) {
    const client = this.clients.get(userId);
    if (!client) return;

    // Clear timer
    const timerKey = `${userId}-${conversationId}`;
    const timer = this.typingTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(timerKey);
    }

    // Broadcast stop typing
    await this.broadcastToConversation(conversationId, userId, {
      type: "user_stopped_typing",
      payload: {
        conversationId,
        userId,
        userName: client.userName,
        isTyping: false,
      },
    });
  }

  private async handleMarkRead(userId: string, conversationId: string, messageId: string) {
    try {
      // Update read receipt in database
      await storage.markMessageRead(messageId, userId);

      // Broadcast read receipt
      await this.broadcastToConversation(conversationId, null, {
        type: "read_receipt",
        payload: {
          conversationId,
          messageId,
          userId,
          readAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[WebSocket] Error marking message as read:", error);
    }
  }

  // Public method to broadcast new messages
  async broadcastNewMessage(conversationId: string, message: any) {
    await this.broadcastToConversation(conversationId, null, {
      type: "message_sent",
      payload: { conversationId, message },
      timestamp: new Date().toISOString(),
    });
  }

  // Public method to broadcast message updates
  async broadcastMessageUpdate(conversationId: string, message: any) {
    await this.broadcastToConversation(conversationId, null, {
      type: "message_updated",
      payload: { conversationId, message },
      timestamp: new Date().toISOString(),
    });
  }

  // Public method to broadcast message deletions
  async broadcastMessageDelete(conversationId: string, messageId: string) {
    await this.broadcastToConversation(conversationId, null, {
      type: "message_deleted",
      payload: { conversationId, messageId },
      timestamp: new Date().toISOString(),
    });
  }

  // Public method to broadcast new meetings
  async broadcastNewMeeting(conversationId: string, meeting: any) {
    await this.broadcastToConversation(conversationId, null, {
      type: "meeting_created",
      payload: { conversationId, meeting },
      timestamp: new Date().toISOString(),
    });
  }

  // Public method to broadcast meeting updates
  async broadcastMeetingUpdate(conversationId: string, meeting: any) {
    await this.broadcastToConversation(conversationId, null, {
      type: "meeting_updated",
      payload: { conversationId, meeting },
      timestamp: new Date().toISOString(),
    });
  }

  // Public method to broadcast RSVP updates
  async broadcastRsvpUpdate(conversationId: string, meetingId: string, participant: any) {
    await this.broadcastToConversation(conversationId, null, {
      type: "rsvp_updated",
      payload: { conversationId, meetingId, participant },
      timestamp: new Date().toISOString(),
    });
  }

  private async broadcastToConversation(
    conversationId: string,
    excludeUserId: string | null,
    message: WsMessage
  ) {
    // OPTIMIZED: Use cached participants to avoid DB query on every broadcast
    const participantIds = await this.getConversationParticipantIds(conversationId);
    
    // Convert Set to Array for iteration
    Array.from(participantIds).forEach(userId => {
      // Skip excluded user (e.g., sender)
      if (excludeUserId && userId === excludeUserId) {
        return;
      }

      // Send to online users only
      this.sendToClient(userId, message);
    });
  }

  // Get conversation participant IDs with caching
  private async getConversationParticipantIds(conversationId: string): Promise<Set<string>> {
    const now = Date.now();
    const cachedTimestamp = this.cacheTimestamps.get(conversationId);
    
    // Check if cache is valid (exists and not expired)
    if (cachedTimestamp && (now - cachedTimestamp < this.CACHE_TTL_MS)) {
      const cached = this.participantCache.get(conversationId);
      if (cached) {
        return cached;
      }
    }
    
    // Cache miss or expired - fetch from DB
    const participants = await storage.getConversationParticipants(conversationId);
    const participantIds = new Set(participants.map(p => p.userId));
    
    // Update cache
    this.participantCache.set(conversationId, participantIds);
    this.cacheTimestamps.set(conversationId, now);
    
    return participantIds;
  }

  // Public method to invalidate participant cache when membership changes
  invalidateParticipantCache(conversationId: string) {
    this.participantCache.delete(conversationId);
    this.cacheTimestamps.delete(conversationId);
  }

  // Periodic cleanup of expired cache entries
  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      this.cacheTimestamps.forEach((timestamp, conversationId) => {
        if (now - timestamp >= this.CACHE_TTL_MS) {
          expiredKeys.push(conversationId);
        }
      });
      
      expiredKeys.forEach(key => {
        this.participantCache.delete(key);
        this.cacheTimestamps.delete(key);
      });
      
      if (expiredKeys.length > 0) {
        console.log(`[WebSocket] Cleaned up ${expiredKeys.length} expired participant cache entries`);
      }
    }, this.CACHE_TTL_MS);
  }

  private broadcastPresence(userId: string, status: "online" | "offline") {
    const message: WsMessage = {
      type: status === "online" ? "user_online" : "user_offline",
      payload: {
        userId,
        status,
        lastSeen: new Date().toISOString(),
      },
    };

    // Broadcast to all connected clients
    this.clients.forEach((client, clientUserId) => {
      if (clientUserId !== userId) {
        this.sendToClient(clientUserId, message);
      }
    });
  }

  private sendToClient(userId: string, message: WsMessage) {
    const client = this.clients.get(userId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[WebSocket] Error sending to ${userId}:`, error);
    }
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.clients.has(userId);
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.clients.size;
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
