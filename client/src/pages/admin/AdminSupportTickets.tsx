import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Clock, MessageSquare, Send, Star, User, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminSupportTickets() {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Build filter params
  const filterParams: Record<string, string> = {};
  if (statusFilter !== "all") filterParams.status = statusFilter;
  if (categoryFilter !== "all") filterParams.category = categoryFilter;
  if (priorityFilter !== "all") filterParams.priority = priorityFilter;

  const filterQuery = new URLSearchParams(filterParams).toString();

  // Fetch all tickets with filters
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['/api/admin/support-tickets', filterQuery],
    queryFn: async () => {
      const url = `/api/admin/support-tickets${filterQuery ? `?${filterQuery}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tickets');
      return response.json();
    },
  });

  // Fetch messages for selected ticket
  const { data: messages } = useQuery({
    queryKey: ['/api/support-tickets', selectedTicket?.id, 'messages'],
    enabled: !!selectedTicket,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return await apiRequest(`/api/admin/support-tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      toast({
        title: "Status Updated",
        description: "Ticket status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Assign ticket mutation
  const assignTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return await apiRequest(`/api/admin/support-tickets/${ticketId}/assign`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-tickets'] });
      toast({
        title: "Ticket Assigned",
        description: "Ticket has been assigned to you",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign ticket",
        variant: "destructive",
      });
    },
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-tickets'] });
      setMessageText("");
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent to the user",
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

  // Add internal note mutation
  const addInternalNoteMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest(`/api/admin/support-tickets/${selectedTicket.id}/internal-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets', selectedTicket.id, 'messages'] });
      setInternalNote("");
      toast({
        title: "Internal Note Added",
        description: "Note visible only to support team",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      open: { variant: "destructive", icon: AlertCircle },
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-tickets-title">
          Support Tickets Management
        </h1>
        <p className="text-muted-foreground" data-testid="text-admin-tickets-subtitle">
          Manage and respond to user support requests
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger data-testid="select-priority-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="verification">Verification</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tickets?.filter((t: any) => t.status === 'open').length || 0}</div>
            <div className="text-sm text-muted-foreground">Open Tickets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tickets?.filter((t: any) => t.status === 'in_progress').length || 0}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tickets?.filter((t: any) => t.priority === 'urgent').length || 0}</div>
            <div className="text-sm text-muted-foreground">Urgent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tickets?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Tickets</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {!tickets || tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">No tickets found</p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket: any) => (
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
                    <CardDescription className="space-y-1">
                      <div>Ticket #{ticket.id.substring(0, 8)} • {ticket.category.replace('_', ' ')}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3" />
                        User ID: {ticket.userId.substring(0, 8)}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Created: {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                  </div>
                  {ticket.assignedTo && (
                    <div>Assigned to: {ticket.assignedTo.substring(0, 8)}</div>
                  )}
                  {ticket.satisfactionRating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      Rating: {ticket.satisfactionRating}/5
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle data-testid="dialog-ticket-title">{selectedTicket?.subject}</DialogTitle>
                <DialogDescription>
                  Ticket #{selectedTicket?.id.substring(0, 8)} • {selectedTicket?.category.replace('_', ' ')} • User: {selectedTicket?.userId.substring(0, 8)}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {selectedTicket && getStatusBadge(selectedTicket.status)}
                {selectedTicket && getPriorityBadge(selectedTicket.priority)}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Ticket Actions */}
            <div className="flex gap-2 flex-wrap">
              {!selectedTicket?.assignedTo && (
                <Button
                  size="sm"
                  onClick={() => assignTicketMutation.mutate(selectedTicket.id)}
                  disabled={assignTicketMutation.isPending}
                  data-testid="button-assign-to-me"
                >
                  Assign to Me
                </Button>
              )}
              <Select
                value={selectedTicket?.status}
                onValueChange={(status) =>
                  updateStatusMutation.mutate({ ticketId: selectedTicket.id, status })
                }
              >
                <SelectTrigger className="w-[180px]" data-testid="select-update-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Initial Description */}
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                {selectedTicket?.description}
              </p>
            </div>

            {/* Conversation */}
            {messages && messages.length > 0 && (
              <div>
                <h4 className="font-medium mb-4">Conversation</h4>
                <div className="space-y-4">
                  {messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.isStaffReply ? 'flex-row-reverse' : 'flex-row'} ${msg.isInternal ? 'opacity-60' : ''}`}
                      data-testid={`message-${msg.id}`}
                    >
                      <div className={`flex-1 ${msg.isStaffReply ? 'text-right' : ''}`}>
                        <div
                          className={`inline-block p-3 rounded-lg ${
                            msg.isStaffReply
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.isInternal && (
                            <div className="text-xs font-medium mb-1 opacity-80">Internal Note</div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Tabs defaultValue="reply" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reply">Reply to User</TabsTrigger>
                <TabsTrigger value="note">Internal Note</TabsTrigger>
              </TabsList>
              <TabsContent value="reply" className="space-y-2">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your reply to the user..."
                  rows={4}
                  data-testid="textarea-reply"
                />
                <Button
                  onClick={() => sendMessageMutation.mutate(messageText)}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-reply"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendMessageMutation.isPending ? "Sending..." : "Send Reply"}
                </Button>
              </TabsContent>
              <TabsContent value="note" className="space-y-2">
                <Textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add an internal note (not visible to user)..."
                  rows={4}
                  data-testid="textarea-internal-note"
                />
                <Button
                  onClick={() => addInternalNoteMutation.mutate(internalNote)}
                  disabled={!internalNote.trim() || addInternalNoteMutation.isPending}
                  variant="outline"
                  data-testid="button-add-internal-note"
                >
                  {addInternalNoteMutation.isPending ? "Adding..." : "Add Internal Note"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
