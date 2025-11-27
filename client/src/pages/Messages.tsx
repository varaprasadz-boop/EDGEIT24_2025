import { useEffect, useState, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTranslation } from 'react-i18next';
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
import { FileUpload } from "@/components/FileUpload";
import { MeetingScheduler } from "@/components/MeetingScheduler";
import { MeetingCard } from "@/components/MeetingCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, FileIcon, Download } from "lucide-react";
import type { WsMessage } from "@shared/schema";

type MeetingLink = {
  id: string;
  conversationId: string;
  createdBy: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  duration: number | null;
  meetingType: string;
  meetingUrl: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type MeetingParticipant = {
  id: string;
  meetingId: string;
  userId: string;
  responseStatus: string;
};

type MessageFile = {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  createdAt: Date;
};

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
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/messages/:conversationId?");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
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

  const { 
    data: messagesData, 
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`/api/conversations/${selectedConversationId}/messages`, window.location.origin);
      url.searchParams.set("limit", "50");
      if (pageParam) {
        url.searchParams.set("beforeMessageId", pageParam);
      }
      
      const response = await fetch(url.toString(), {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const data = await response.json();
      return data.messages || [];
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      // Last page is newest messages, so the oldest (last item) is our cursor for next page
      return lastPage[lastPage.length - 1].id;
    },
    initialPageParam: undefined,
    enabled: !!selectedConversationId,
  });

  // Reverse pages and flatten to get oldest-to-newest chronological order
  // Server returns newest-first (DESC), but UI needs oldest-first for chat
  // Process pages from last to first, reversing each page to get chronological order
  const messages = messagesData?.pages
    .reduceRight((acc, page) => acc.concat([...page].reverse()), [] as typeof messagesData.pages[0])
    || [];

  const { data: unreadCount } = useQuery<{ unreadCount: number }>({
    queryKey: ["/api/conversations", selectedConversationId, "unread-count"],
    enabled: !!selectedConversationId,
  });

  // Fetch message files for the conversation
  // Include messages in query key so it refetches when messages change
  const messageIds = messages?.map((m: Message) => m.id) || [];
  const { data: messageFilesMap = {} } = useQuery<Record<string, MessageFile[]>>({
    queryKey: ["/api/conversations", selectedConversationId, "files", messageIds.join(",")],
    queryFn: async () => {
      if (!selectedConversationId) return {};
      
      // Use the conversation files endpoint which is more efficient
      const response = await fetch(`/api/conversations/${selectedConversationId}/files?limit=100`, {
        credentials: "include",
      });
      
      if (!response.ok) return {};
      
      const files: MessageFile[] = await response.json();
      
      // Create a map of messageId -> files[], initializing all message IDs
      const filesMap: Record<string, MessageFile[]> = {};
      
      // Initialize all message IDs with empty arrays
      messageIds.forEach((id: string) => {
        filesMap[id] = [];
      });
      
      // Populate with actual files
      files.forEach(file => {
        if (!filesMap[file.messageId]) {
          filesMap[file.messageId] = [];
        }
        filesMap[file.messageId].push(file);
      });
      
      return filesMap;
    },
    enabled: !!selectedConversationId && messageIds.length > 0,
  });

  // Fetch meetings for the conversation
  const { data: meetings = [] } = useQuery<MeetingLink[]>({
    queryKey: ["/api/conversations", selectedConversationId, "meetings"],
    enabled: !!selectedConversationId,
  });

  // Fetch meeting participants for all meetings
  const { data: meetingParticipantsMap = {} } = useQuery<Record<string, MeetingParticipant[]>>({
    queryKey: ["/api/conversations", selectedConversationId, "meeting-participants"],
    queryFn: async () => {
      if (!meetings || meetings.length === 0) return {};
      
      const participantsPromises = meetings.map(async (meeting) => {
        const response = await fetch(`/api/meetings/${meeting.id}/participants`, {
          credentials: "include",
        });
        if (!response.ok) return { meetingId: meeting.id, participants: [] };
        const participants = await response.json();
        return { meetingId: meeting.id, participants };
      });
      
      const results = await Promise.all(participantsPromises);
      const participantsMap: Record<string, MeetingParticipant[]> = {};
      results.forEach(({ meetingId, participants }) => {
        participantsMap[meetingId] = participants;
      });
      
      return participantsMap;
    },
    enabled: !!selectedConversationId && meetings.length > 0,
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
          // For infinite queries, we just invalidate and let it refetch the first page
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", message.payload.conversationId, "messages"],
          });
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", message.payload.conversationId, "files"],
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

      case "meeting_created":
      case "meeting_updated":
        // Invalidate meetings query to refetch
        if (message.payload.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", message.payload.conversationId, "meetings"],
          });
        }
        break;

      case "rsvp_updated":
        // Invalidate meeting participants query to refetch
        if (message.payload.conversationId && message.payload.meetingId) {
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", message.payload.conversationId, "meeting-participants"],
          });
          // Also invalidate meetings to update participant counts
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", message.payload.conversationId, "meetings"],
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

  const uploadFileMutation = useMutation({
    mutationFn: async (variables: { 
      file: File; 
      messageId: string; 
      conversationId: string;
    }) => {
      // Upload file to server (simulated for now - would use actual file upload)
      // In a real implementation, this would upload to cloud storage and get a URL
      const fileUrl = `https://storage.example.com/files/${variables.file.name}`;
      
      const response = await apiRequest(
        "POST",
        `/api/conversations/${variables.conversationId}/messages/${variables.messageId}/files`,
        {
          fileName: variables.file.name,
          fileSize: variables.file.size,
          mimeType: variables.file.type,
          fileUrl: fileUrl,
        }
      );
      return await response.json();
    },
    onError: (error: any) => {
      toast({
        title: t('messages.fileUploadFailed'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (variables: { content: string; conversationId: string; file?: File }) => {
      const response = await apiRequest(
        "POST",
        `/api/conversations/${variables.conversationId}/messages`,
        { content: variables.content || (variables.file ? `Sent a file: ${variables.file.name}` : "") }
      );
      const message = await response.json();
      
      // If there's a file, upload it
      if (variables.file) {
        await uploadFileMutation.mutateAsync({
          file: variables.file,
          messageId: message.id,
          conversationId: variables.conversationId,
        });
      }
      
      return message;
    },
    onSuccess: async (_data, variables) => {
      setMessageInput("");
      setSelectedFile(null);
      // Invalidate messages query to refetch using the ID from mutation variables
      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", variables.conversationId, "messages"],
      });
      // Invalidate files query to refetch uploaded files
      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", variables.conversationId, "files"],
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
        title: t('messages.messageSent', { defaultValue: 'Failed to send message' }),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data: {
      conversationId: string;
      title: string;
      description?: string;
      scheduledAt: string;
      duration?: number;
      meetingType: string;
      meetingUrl: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/conversations/${data.conversationId}/meetings`,
        data
      );
      return await response.json();
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", variables.conversationId, "meetings"],
      });
      toast({
        title: t('meetings.meetingCreated'),
        description: t('meetings.meetingCreatedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('meetings.meetingError'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

  const updateRsvpMutation = useMutation({
    mutationFn: async (data: {
      meetingId: string;
      participantId: string;
      status: "accepted" | "declined" | "tentative";
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/meetings/${data.meetingId}/participants/${data.participantId}`,
        { responseStatus: data.status }
      );
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversationId, "meeting-participants"],
      });
      toast({
        title: t('meetings.inviteResponded'),
        description: t('common.success'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

  const filteredConversations = conversations?.filter((conv) =>
    (conv.title?.toLowerCase() ?? "").includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if ((!messageInput.trim() && !selectedFile) || !selectedConversationId || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate({
      content: messageInput,
      conversationId: selectedConversationId,
      file: selectedFile || undefined,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{t('messages.title')} - EDGEIT24</title>
        <meta name="description" content={t('messages.subtitle')} />
      </Helmet>

      <div className="flex h-screen">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('messages.title')}</h2>
              <NewConversationDialog />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('messages.searchConversations')}
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
                {t('messages.loadingConversations')}
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
                            {conversation.title || t('messages.conversationWith', { name: 'User' })}
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
                          {conversation.isGroup ? t('messages.groupConversation') : t('messages.conversationWith', { name: 'User' })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">{t('messages.noConversations')}</p>
                <NewConversationDialog
                  trigger={
                    <Button variant="outline" data-testid="button-start-conversation">
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      {t('messages.newConversation')}
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
                      {selectedConversation?.conversation.title || t('messages.conversationWith', { name: 'User' })}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation?.participants.length} {t('messages.participants')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MeetingScheduler
                    conversationId={selectedConversationId}
                    onSchedule={async (data) => {
                      await createMeetingMutation.mutateAsync({
                        conversationId: selectedConversationId,
                        ...data,
                      });
                    }}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid="button-schedule-meeting"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {t('meetings.scheduleMeeting')}
                      </Button>
                    }
                  />

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
                        {t('common.view')} {t('common.details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem data-testid="menu-archive">
                        {t('messages.archiveConversation')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {/* Display Meetings */}
                {meetings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                      {t('meetings.scheduledMeetings', { defaultValue: 'Scheduled Meetings' })}
                    </h3>
                    <div className="space-y-3">
                      {meetings.map((meeting) => (
                        <MeetingCard
                          key={meeting.id}
                          meeting={meeting}
                          currentUserId={user?.id || ""}
                          participants={meetingParticipantsMap[meeting.id] || []}
                          onRsvp={async (meetingId, status) => {
                            const participant = meetingParticipantsMap[meetingId]?.find(
                              (p) => p.userId === user?.id
                            );
                            if (participant) {
                              await updateRsvpMutation.mutateAsync({
                                meetingId,
                                participantId: participant.id,
                                status,
                              });
                            }
                          }}
                        />
                      ))}
                    </div>
                    <Separator className="my-4" />
                  </div>
                )}

                {messagesLoading ? (
                  <div className="text-center text-muted-foreground">
                    {t('messages.loadingMessages')}
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {/* Load More Button */}
                    {hasNextPage && (
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                          data-testid="button-load-more-messages"
                        >
                          {isFetchingNextPage ? t('messages.loadingMore') : t('messages.loadMore')}
                        </Button>
                      </div>
                    )}
                    
                    {messages.map((message: Message) => {
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
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                            
                            {/* Display attached files */}
                            {messageFilesMap[message.id]?.map((file) => (
                              <a
                                key={file.id}
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={file.fileName}
                                className={`mt-2 flex items-center gap-2 p-2 rounded border hover-elevate active-elevate-2 ${
                                  isOwnMessage
                                    ? "border-primary-foreground/20 bg-primary-foreground/10"
                                    : "border-border bg-background/50"
                                }`}
                                data-testid={`file-${file.id}`}
                                aria-label={`Download ${file.fileName}`}
                              >
                                <FileIcon className="h-4 w-4 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{file.fileName}</p>
                                  <p className="text-xs opacity-70">
                                    {(file.fileSize / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <Download className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                              </a>
                            ))}
                            
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
                    {t('messages.noMessagesDesc')}
                  </div>
                )}
              </ScrollArea>

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  {Array.from(typingUsers.values()).join(", ")} {t('messages.typingIndicator')}
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t">
                {selectedFile && (
                  <div className="mb-3">
                    <FileUpload
                      onFileSelect={setSelectedFile}
                      onFileRemove={() => setSelectedFile(null)}
                      disabled={sendMessageMutation.isPending}
                    />
                  </div>
                )}
                
                <div className="flex items-end gap-2">
                  <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={!selectedConversationId}
                        data-testid="button-attach-file"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('messages.attachFile')}</DialogTitle>
                        <DialogDescription>
                          {t('messages.fileAttachment')}
                        </DialogDescription>
                      </DialogHeader>
                      <FileUpload
                        onFileSelect={(file) => {
                          setSelectedFile(file);
                          setIsFileDialogOpen(false);
                        }}
                        maxSizeMB={25}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  <Textarea
                    placeholder={selectedConversationId ? t('messages.messageInput') : t('messages.selectConversation')}
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
                      disabled={(!messageInput.trim() && !selectedFile) || sendMessageMutation.isPending || !selectedConversationId}
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
                <h2 className="text-xl font-semibold mb-2">{t('messages.selectConversation')}</h2>
                <p className="text-muted-foreground">
                  {t('messages.selectConversationDesc')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
