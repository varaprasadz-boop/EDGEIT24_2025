import { useState } from "react";
import { useQuery, useMutation, queryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, MessageSquare, Star, Send, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export default function MySupportTickets() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  // Fetch user's tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['/api/support-tickets'],
  });

  // Fetch messages for selected ticket
  const { data: messages } = useQuery({
    queryKey: ['/api/support-tickets', selectedTicket?.id, 'messages'],
    enabled: !!selectedTicket,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest(`/api/support-tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets', selectedTicket.id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      setMessageText("");
      toast({
        title: "Message Sent",
        description: "Your message has been added to the ticket",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Rate ticket mutation
  const rateTicketMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      return await apiRequest(`/api/support-tickets/${selectedTicket.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      setRating(0);
      setRatingComment("");
      setSelectedTicket(null);
      toast({
        title: "Thank You!",
        description: "Your feedback helps us improve our support",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      open: { variant: "default", icon: AlertCircle },
      in_progress: { variant: "default", icon: Loader2 },
      resolved: { variant: "default", icon: CheckCircle },
      closed: { variant: "secondary", icon: XCircle },
    };

    const { variant, icon: Icon } = variants[status] || variants.open;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-500",
      high: "bg-orange-500",
      medium: "bg-yellow-500",
      low: "bg-green-500",
    };

    return (
      <Badge className={colors[priority] || colors.medium}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const filterTicketsByStatus = (status?: string) => {
    if (!tickets) return [];
    if (!status) return tickets;
    return tickets.filter((t: any) => t.status === status);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-my-tickets-title">
            My Support Tickets
          </h1>
          <p className="text-muted-foreground" data-testid="text-my-tickets-subtitle">
            View and manage your support requests
          </p>
        </div>
        <Button onClick={() => navigate("/help/contact")} data-testid="button-new-ticket">
          <MessageSquare className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({tickets?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="open" data-testid="tab-open">
            Open ({filterTicketsByStatus('open').length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" data-testid="tab-in-progress">
            In Progress ({filterTicketsByStatus('in_progress').length})
          </TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved">
            Resolved ({filterTicketsByStatus('resolved').length})
          </TabsTrigger>
        </TabsList>

        {(['all', 'open', 'in_progress', 'resolved'] as const).map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filterTicketsByStatus(status === 'all' ? undefined : status).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No {status === 'all' ? '' : status.replace('_', ' ')} tickets found
                  </p>
                </CardContent>
              </Card>
            ) : (
              filterTicketsByStatus(status === 'all' ? undefined : status).map((ticket: any) => (
                <Card
                  key={ticket.id}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => setSelectedTicket(ticket)}
                  data-testid={`card-ticket-${ticket.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        </div>
                        <CardDescription>
                          Ticket #{ticket.id.substring(0, 8)} • {ticket.category.replace('_', ' ')}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                      </div>
                      {ticket.updatedAt && (
                        <div className="flex items-center gap-1">
                          Last updated: {format(new Date(ticket.updatedAt), 'MMM d, h:mm a')}
                        </div>
                      )}
                      {ticket.satisfactionRating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {ticket.satisfactionRating}/5
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle data-testid="dialog-ticket-title">{selectedTicket?.subject}</DialogTitle>
                <DialogDescription>
                  Ticket #{selectedTicket?.id.substring(0, 8)} • {selectedTicket?.category.replace('_', ' ')}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {selectedTicket && getStatusBadge(selectedTicket.status)}
                {selectedTicket && getPriorityBadge(selectedTicket.priority)}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Initial Description */}
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedTicket?.description}
              </p>
            </div>

            {/* Messages */}
            {messages && messages.length > 0 && (
              <div>
                <h4 className="font-medium mb-4">Conversation</h4>
                <div className="space-y-4">
                  {messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.isStaffReply ? 'flex-row' : 'flex-row-reverse'}`}
                      data-testid={`message-${msg.id}`}
                    >
                      <div className={`flex-1 ${msg.isStaffReply ? '' : 'text-right'}`}>
                        <div
                          className={`inline-block p-3 rounded-lg ${
                            msg.isStaffReply
                              ? 'bg-muted'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                            {msg.isStaffReply && ' • Support Team'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Message */}
            {selectedTicket && ['open', 'in_progress'].includes(selectedTicket.status) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Reply</label>
                <div className="flex gap-2">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    data-testid="textarea-message"
                  />
                </div>
                <Button
                  onClick={() => sendMessageMutation.mutate(messageText)}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendMessageMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            )}

            {/* Rate Ticket */}
            {selectedTicket && ['resolved', 'closed'].includes(selectedTicket.status) && !selectedTicket.satisfactionRating && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Rate This Support Experience</h4>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="hover-elevate active-elevate-2 p-1 rounded"
                      data-testid={`button-rating-${star}`}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Share your feedback (optional)..."
                  rows={3}
                  data-testid="textarea-rating-comment"
                />
                <Button
                  onClick={() => rateTicketMutation.mutate({ rating, comment: ratingComment })}
                  disabled={rating === 0 || rateTicketMutation.isPending}
                  data-testid="button-submit-rating"
                >
                  {rateTicketMutation.isPending ? "Submitting..." : "Submit Rating"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
