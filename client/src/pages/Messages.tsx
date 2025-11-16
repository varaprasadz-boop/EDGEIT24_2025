import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
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

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  const filteredConversations = conversations?.filter((conv) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    
    try {
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageInput }),
        credentials: "include",
      });

      if (response.ok) {
        setMessageInput("");
        // Refresh messages
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
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
              <Button
                size="icon"
                variant="ghost"
                data-testid="button-new-conversation"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
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
                <Button variant="outline" data-testid="button-start-conversation">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Start a conversation
                </Button>
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
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[80px] resize-none"
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
                      disabled={!messageInput.trim()}
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
