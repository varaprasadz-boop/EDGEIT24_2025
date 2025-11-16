import { useEffect, useState, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Search, MoreVertical, Send, Paperclip, Smile } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import type { WsMessage } from "@shared/schema";

type Conversation = {
  id: string;
  title: string | null;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
  lastMessageAt: Date | null;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  deleted: boolean;
  replyToId: string | null;
};

type ConversationParticipant = {
  id: string;
  conversationId: string;
  userId: string;
  role: string;
  status: string;
};

export default function Messages() {
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/messages/:conversationId?");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedConversationId = params?.conversationId;

  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  const { data: selectedConversation } = useQuery<{
    conversation: Conversation;
    participants: ConversationParticipant[];
  }>({
    queryKey: ["/api/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
  });

  const { data: unreadCount } = useQuery<{ unreadCount: number }>({
    queryKey: ["/api/conversations", selectedConversationId, "unread-count"],
    enabled: !!selectedConversationId,
  });

  // WebSocket state
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useState<Map<string, NodeJS.Timeout>>(new Map())[0];

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: WsMessage) => {
    switch (message.type) {
      case "message_sent":
        // Invalidate queries to refetch new message
        if (message.payload.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", message.payload.conversationId, "messages"],
          });
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations"],
          });
        }
        break;

      case "user_typing":
        if (message.payload.conversationId === selectedConversationId) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.set(message.payload.userId, message.payload.userName);
            return next;
          });

          // Clear existing timeout
          const existingTimeout = typingTimeoutRef.get(message.payload.userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Auto-clear after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.delete(message.payload.userId);
              return next;
            });
            typingTimeoutRef.delete(message.payload.userId);
          }, 3000);
          typingTimeoutRef.set(message.payload.userId, timeout);
        }
        break;

      case "user_stopped_typing":
        if (message.payload.conversationId === selectedConversationId) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(message.payload.userId);
            return next;
          });
          const timeout = typingTimeoutRef.get(message.payload.userId);
          if (timeout) {
            clearTimeout(timeout);
            typingTimeoutRef.delete(message.payload.userId);
          }
        }
        break;

      case "user_online":
        setOnlineUsers((prev) => new Set(prev).add(message.payload.userId));
        break;

      case "user_offline":
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(message.payload.userId);
          return next;
        });
        break;

      case "read_receipt":
        // Invalidate unread count
        if (message.payload.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", message.payload.conversationId, "unread-count"],
          });
        }
        break;
    }
  }, [queryClient, selectedConversationId, typingTimeoutRef]);

  // Initialize WebSocket
  const { isConnected, joinConversation, leaveConversation, startTyping, stopTyping } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnected: () => {
      console.log("WebSocket connected");
    },
    onDisconnected: () => {
      console.log("WebSocket disconnected");
    },
  });

  // Join/leave conversation when selection changes
  useEffect(() => {
    if (selectedConversationId && isConnected) {
      joinConversation(selectedConversationId);
      return () => {
        leaveConversation(selectedConversationId);
      };
    }
  }, [selectedConversationId, isConnected, joinConversation, leaveConversation]);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (selectedConversationId && isConnected) {
      startTyping(selectedConversationId);
    }
  }, [selectedConversationId, isConnected, startTyping]);

  const sendMessageMutation = useMutation({
    mutationFn: async (variables: { content: string; conversationId: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/conversations/${variables.conversationId}/messages`,
        { content: variables.content }
      );
      return await response.json();
    },
    onSuccess: async (_data, variables) => {
      setMessageInput("");
      // Invalidate messages query to refetch using the ID from mutation variables
      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", variables.conversationId, "messages"],
      });
      // Invalidate unread count for this conversation
      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", variables.conversationId, "unread-count"],
      });
      // Also invalidate conversations list to update last message time
      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "An error occurred while sending your message",
        variant: "destructive",
      });
    },
  });

  const filteredConversations = conversations?.filter((conv) =>
    (conv.title?.toLowerCase() ?? "").includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate({
      content: messageInput,
      conversationId: selectedConversationId,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Messages - EDGEIT24</title>
        <meta name="description" content="Communicate with clients and consultants on EDGEIT24" />
      </Helmet>

      <div className="flex h-screen">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Messages</h2>
              <NewConversationDialog />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-conversations"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversationsLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading conversations...
              </div>
            ) : filteredConversations && filteredConversations.length > 0 ? (
              <div className="divide-y">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setLocation(`/messages/${conversation.id}`)}
                    className={`w-full p-4 text-left hover-elevate active-elevate-2 ${
                      selectedConversationId === conversation.id
                        ? "bg-accent"
                        : ""
                    }`}
                    data-testid={`conversation-item-${conversation.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {conversation.isGroup ? "G" : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium truncate">
                            {conversation.title || "Untitled Conversation"}
                          </h3>
                          {conversation.lastMessageAt && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.isGroup ? "Group conversation" : "Direct message"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No conversations yet</p>
                <NewConversationDialog
                  trigger={
                    <Button variant="outline" data-testid="button-start-conversation">
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Start a conversation
                    </Button>
                  }
                />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message Thread */}
        <div className="flex-1 flex flex-col">
          {selectedConversationId ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedConversation?.conversation.isGroup ? "G" : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold" data-testid="conversation-title">
                      {selectedConversation?.conversation.title || "Untitled Conversation"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation?.participants.length} participant
                      {selectedConversation?.participants.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid="button-conversation-menu"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem data-testid="menu-view-details">
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="menu-archive">
                      Archive conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="text-center text-muted-foreground">
                    Loading messages...
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatDistanceToNow(new Date(message.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                )}
              </ScrollArea>

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  {Array.from(typingUsers.values()).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex items-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid="button-attach-file"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  
                  <Textarea
                    placeholder={selectedConversationId ? "Type a message..." : "Select a conversation to send messages"}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && selectedConversationId) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[80px] resize-none"
                    disabled={!selectedConversationId}
                    data-testid="input-message"
                  />

                  <div className="flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid="button-emoji"
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending || !selectedConversationId}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquarePlus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
                <p className="text-muted-foreground">
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
