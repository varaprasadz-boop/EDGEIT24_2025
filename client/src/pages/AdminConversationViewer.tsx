import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, ArrowLeft, AlertTriangle, Eye, EyeOff, Flag, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: {
    fullName: string;
    email: string;
  };
}

interface Participant {
  userId: string;
  role: string;
  user: {
    fullName: string;
    email: string;
  };
}

interface Conversation {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  lastMessageAt: string | null;
}

interface ConversationDetails {
  conversation: Conversation;
  participants: Participant[];
  messages: Message[];
}

interface ModerationAction {
  id: string;
  messageId: string;
  moderatedBy: string;
  action: string;
  reason: string | null;
  notes: string | null;
  createdAt: string;
}

type ModerationActionType = 'flagged' | 'hidden' | 'redacted' | 'warned' | 'cleared';

export default function AdminConversationViewer() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [moderationDialogOpen, setModerationDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [moderationAction, setModerationAction] = useState<ModerationActionType>('flagged');
  const [moderationReason, setModerationReason] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');

  const { data: conversationData, isLoading, error } = useQuery<ConversationDetails>({
    queryKey: [`/api/admin/messaging/conversations/${id}`],
    enabled: !!id,
  });

  const { data: moderationHistory } = useQuery<ModerationAction[]>({
    queryKey: [`/api/admin/messaging/messages/${selectedMessage}/moderation-history`],
    enabled: !!selectedMessage && historyDialogOpen,
  });

  const moderateMutation = useMutation({
    mutationFn: async (data: { messageId: string; action: string; reason: string; notes?: string }) =>
      apiRequest('POST', `/api/admin/messaging/messages/${data.messageId}/moderate`, {
        action: data.action,
        reason: data.reason,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast({
        title: "Message moderated",
        description: "Moderation action has been recorded",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/messaging/conversations/${id}`] });
      setModerationDialogOpen(false);
      setModerationReason('');
      setModerationNotes('');
      setSelectedMessage(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to moderate message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error || !conversationData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            {error ? (
              <>
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium">Failed to load conversation</p>
                <p className="text-sm text-muted-foreground mt-1">Please try again</p>
              </>
            ) : (
              <>
                <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Conversation not found</p>
              </>
            )}
            <Button className="w-full mt-4" onClick={() => setLocation("/messages")}>
              Back to Messages
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { conversation, participants, messages } = conversationData;

  const handleModerateMessage = (messageId: string) => {
    setSelectedMessage(messageId);
    setModerationDialogOpen(true);
  };

  const handleViewHistory = (messageId: string) => {
    setSelectedMessage(messageId);
    setHistoryDialogOpen(true);
  };

  const handleSubmitModeration = () => {
    if (!selectedMessage || !moderationReason.trim()) return;

    moderateMutation.mutate({
      messageId: selectedMessage,
      action: moderationAction,
      reason: moderationReason.trim(),
      notes: moderationNotes.trim() || undefined,
    });
  };

  // Validation state for moderation form
  const canSubmitModeration = moderationReason.trim().length > 0 && !moderateMutation.isPending;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'flagged': return <Flag className="h-4 w-4 text-yellow-500" />;
      case 'hidden': return <EyeOff className="h-4 w-4 text-red-500" />;
      case 'redacted': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'warned': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'cleared': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/messages")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Messages
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Conversation Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>{conversation.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Created {format(new Date(conversation.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
              <Badge variant="secondary">{conversation.type}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <h4 className="font-medium mb-2">Participants</h4>
              <div className="flex flex-wrap gap-2">
                {participants.map((participant: Participant) => (
                  <Badge key={participant.userId} variant="outline">
                    {participant.user.fullName} ({participant.role})
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Messages ({messages.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              <Shield className="inline h-4 w-4 mr-1" />
              Read-only view for moderation purposes
            </p>
          </CardHeader>
          <CardContent>
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message: Message) => (
                  <div
                    key={message.id}
                    className="flex gap-3 p-4 rounded-lg bg-muted/30"
                    data-testid={`message-${message.id}`}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {message.sender?.fullName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium">{message.sender?.fullName || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerateMessage(message.id)}
                          data-testid={`button-moderate-${message.id}`}
                        >
                          <Flag className="mr-2 h-3 w-3" />
                          Moderate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewHistory(message.id)}
                          data-testid={`button-history-${message.id}`}
                        >
                          <FileText className="mr-2 h-3 w-3" />
                          History
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No messages in this conversation</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Moderation Dialog */}
      <Dialog open={moderationDialogOpen} onOpenChange={setModerationDialogOpen}>
        <DialogContent data-testid="dialog-moderation">
          <DialogHeader>
            <DialogTitle>Moderate Message</DialogTitle>
            <DialogDescription>
              Take action on this message for policy violations or inappropriate content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select
                value={moderationAction}
                onValueChange={(value: ModerationActionType) => setModerationAction(value)}
              >
                <SelectTrigger id="action" data-testid="select-moderation-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flagged">Flag for Review</SelectItem>
                  <SelectItem value="hidden">Hide Message</SelectItem>
                  <SelectItem value="redacted">Redact Content</SelectItem>
                  <SelectItem value="warned">Issue Warning</SelectItem>
                  <SelectItem value="cleared">Clear Flags</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this action is being taken..."
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                data-testid="input-moderation-reason"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes for internal reference..."
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                data-testid="input-moderation-notes"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {moderateMutation.error && (
              <p className="text-sm text-destructive text-left flex-1">
                Error: {(moderateMutation.error as any)?.message || 'Failed to submit moderation'}
              </p>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setModerationDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitModeration}
                disabled={!canSubmitModeration}
                data-testid="button-submit-moderation"
              >
                {moderateMutation.isPending ? 'Submitting...' : 'Submit Action'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-history">
          <DialogHeader>
            <DialogTitle>Moderation History</DialogTitle>
            <DialogDescription>
              All moderation actions taken on this message
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            {moderationHistory && moderationHistory.length > 0 ? (
              <div className="space-y-3">
                {moderationHistory.map((action: ModerationAction) => (
                  <Card key={action.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        {getActionIcon(action.action)}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="secondary">{action.action}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(action.createdAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {action.reason && (
                            <p className="text-sm mb-2">
                              <strong>Reason:</strong> {action.reason}
                            </p>
                          )}
                          {action.notes && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Notes:</strong> {action.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No moderation history for this message</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
