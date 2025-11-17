import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Clock, CheckCircle, XCircle, Eye, Calendar } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface RFQInvitation {
  id: string;
  jobId: string;
  clientId: string;
  consultantId: string;
  message: string;
  deadline: string;
  status: "pending" | "accepted" | "declined" | "expired";
  bidId: string | null;
  createdAt: string;
  respondedAt: string | null;
  job?: {
    id: string;
    title: string;
    description: string;
    budget: string | null;
  };
  client?: {
    id: string;
    companyName: string | null;
    firstName: string;
    lastName: string;
  };
}

export function ConsultantRFQList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRFQ, setSelectedRFQ] = useState<RFQInvitation | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: invitations, isLoading } = useQuery<RFQInvitation[]>({
    queryKey: ["/api/rfq/invitations"],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status, bidId }: { id: string; status: string; bidId?: string }) => {
      return await apiRequest("PATCH", `/api/rfq/${id}/respond`, { status, bidId });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === "accepted" ? "Invitation accepted" : "Invitation declined",
        description:
          variables.status === "accepted"
            ? "You can now submit your bid for this project."
            : "The invitation has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rfq/invitations"] });
      setShowDetailsDialog(false);
      setSelectedRFQ(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to respond",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (rfq: RFQInvitation) => {
    setSelectedRFQ(rfq);
    setShowDetailsDialog(true);
  };

  const handleAccept = (rfq: RFQInvitation) => {
    respondMutation.mutate({ id: rfq.id, status: "accepted" });
  };

  const handleDecline = (rfq: RFQInvitation) => {
    respondMutation.mutate({ id: rfq.id, status: "declined" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingInvitations = invitations?.filter(inv => inv.status === "pending") || [];
  const respondedInvitations = invitations?.filter(inv => inv.status !== "pending") || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4" data-testid="heading-pending-rfqs">
          Pending Invitations ({pendingInvitations.length})
        </h3>
        <div className="grid gap-4">
          {pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending RFQ invitations</p>
              </CardContent>
            </Card>
          ) : (
            pendingInvitations.map((rfq) => (
              <Card key={rfq.id} className="hover-elevate" data-testid={`card-rfq-${rfq.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base" data-testid={`text-job-title-${rfq.id}`}>
                        {rfq.job?.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        From {rfq.client?.companyName || `${rfq.client?.firstName} ${rfq.client?.lastName}`}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-status-${rfq.id}`}>
                      {rfq.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-message-${rfq.id}`}>
                    {rfq.message}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2" data-testid={`deadline-${rfq.id}`}>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Deadline: {format(new Date(rfq.deadline), "PPP")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground ml-auto">
                      <Clock className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(rfq.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {rfq.job?.budget && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Budget:</span>{" "}
                      <span className="font-semibold">﷼{parseFloat(rfq.job.budget).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(rfq)}
                      data-testid={`button-view-${rfq.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAccept(rfq)}
                      disabled={respondMutation.isPending}
                      data-testid={`button-accept-${rfq.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDecline(rfq)}
                      disabled={respondMutation.isPending}
                      data-testid={`button-decline-${rfq.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {respondedInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4" data-testid="heading-responded-rfqs">
            Past Invitations ({respondedInvitations.length})
          </h3>
          <div className="grid gap-4">
            {respondedInvitations.map((rfq) => (
              <Card key={rfq.id} data-testid={`card-responded-${rfq.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">{rfq.job?.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {rfq.client?.companyName || `${rfq.client?.firstName} ${rfq.client?.lastName}`}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        rfq.status === "accepted" ? "default" :
                        rfq.status === "declined" ? "destructive" :
                        "secondary"
                      }
                    >
                      {rfq.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Responded {formatDistanceToNow(new Date(rfq.respondedAt || rfq.createdAt), { addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* RFQ Details Dialog */}
      {selectedRFQ && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl" data-testid="dialog-rfq-details">
            <DialogHeader>
              <DialogTitle>{selectedRFQ.job?.title}</DialogTitle>
              <DialogDescription>
                RFQ Invitation from {selectedRFQ.client?.companyName || `${selectedRFQ.client?.firstName} ${selectedRFQ.client?.lastName}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Project Description</p>
                <p className="text-sm text-muted-foreground">{selectedRFQ.job?.description}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Invitation Message</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRFQ.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedRFQ.job?.budget && (
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="text-lg font-semibold">﷼{parseFloat(selectedRFQ.job.budget).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="text-lg font-semibold">{format(new Date(selectedRFQ.deadline), "PPP")}</p>
                </div>
              </div>
            </div>

            {selectedRFQ.status === "pending" && (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                  data-testid="button-close-details"
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDecline(selectedRFQ)}
                  disabled={respondMutation.isPending}
                  data-testid="button-decline-details"
                >
                  Decline
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleAccept(selectedRFQ)}
                  disabled={respondMutation.isPending}
                  data-testid="button-accept-details"
                >
                  Accept & Submit Bid
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
