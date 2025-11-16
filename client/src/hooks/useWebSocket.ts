import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import type { WsMessage, WsEventType } from "@shared/schema";

interface UseWebSocketOptions {
  onMessage?: (message: WsMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnected,
    onDisconnected,
    onError,
    autoConnect = true,
  } = options;

  const { user } = useAuthContext();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (!user) {
      console.log("[WebSocket] Cannot connect: User not authenticated");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Already connected");
      return;
    }

    console.log("[WebSocket] Connecting...");
    setConnectionStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;
      onConnected?.();
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        console.log("[WebSocket] Message received:", message.type);
        onMessage?.(message);
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log("[WebSocket] Disconnected:", event.code, event.reason);
      setIsConnected(false);
      setConnectionStatus("disconnected");
      wsRef.current = null;
      onDisconnected?.();

      // Auto-reconnect with exponential backoff
      if (
        autoConnect &&
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
        console.log(
          `[WebSocket] Reconnecting in ${delay}ms (attempt ${
            reconnectAttemptsRef.current + 1
          }/${MAX_RECONNECT_ATTEMPTS})`
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
      setConnectionStatus("error");
      onError?.(error);
    };

    wsRef.current = ws;
  }, [user, autoConnect, onMessage, onConnected, onDisconnected, onError]);

  const disconnect = useCallback(() => {
    console.log("[WebSocket] Disconnecting...");
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus("disconnected");
  }, []);

  const send = useCallback(
    (type: WsEventType, payload: any) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn("[WebSocket] Cannot send: Not connected");
        return false;
      }

      try {
        const message: WsMessage = {
          type,
          payload,
          timestamp: new Date().toISOString(),
        };
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("[WebSocket] Error sending message:", error);
        return false;
      }
    },
    []
  );

  const joinConversation = useCallback(
    (conversationId: string) => {
      return send("join_conversation", { conversationId });
    },
    [send]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      return send("leave_conversation", { conversationId });
    },
    [send]
  );

  const startTyping = useCallback(
    (conversationId: string) => {
      return send("typing_start", { conversationId });
    },
    [send]
  );

  const stopTyping = useCallback(
    (conversationId: string) => {
      return send("typing_stop", { conversationId });
    },
    [send]
  );

  const markAsRead = useCallback(
    (conversationId: string, messageId: string) => {
      return send("mark_read", { conversationId, messageId });
    },
    [send]
  );

  // Auto-connect when user logs in
  useEffect(() => {
    if (user && autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, autoConnect, connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    send,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markAsRead,
  };
}
