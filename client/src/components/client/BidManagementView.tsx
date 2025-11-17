import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, DollarSign, Clock, Users, Package, Settings, CheckCircle, XCircle, Eye, Bookmark, MessageSquare, TrendingUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { Bid } from "@shared/schema";

interface BidWithDetails extends Bid {
  consultant?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    avgRating: number | null;
    completedProjects: number;
  };
}

interface BidManagementViewProps {
  jobId: string;
}

export function BidManagementView({ jobId }: BidManagementViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "budget" | "rating">("date");
  const [selectedBid, setSelectedBid] = useState<BidWithDetails | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineMessage, setDeclineMessage] = useState("");
  const [compareBids, setCompareBids] = useState<string[]>([]);

  const { data: bidsData, isLoading } = useQuery<{ bids: BidWithDetails[]; total: number }>({
    queryKey: ["/api/jobs", jobId, "bids", { status: statusFilter === "all" ? undefined : statusFilter, sortBy }],
    enabled: !!jobId,
  });

  const bids = bidsData?.bids || [];

  const { data: shortlistData } = useQuery<BidWithDetails[]>({
    queryKey: ["/api/jobs", jobId, "shortlist"],
    enabled: !!jobId,
  });

  const shortlistedBids = shortlistData || [];

  const acceptBidMutation = useMutation({
    mutationFn: async (bidId: string) => {
      return await apiRequest("POST", `/api/bids/${bidId}/accept`, {});
    },
    onSuccess: () => {
      toast({
        title: "Bid accepted",
        description: "The bid has been accepted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "bids"] });
      setSelectedBid(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept bid",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const declineBidMutation = useMutation({
    mutationFn: async ({ bidId, message }: { bidId: string; message: string }) => {
      return await apiRequest("POST", `/api/bids/${bidId}/decline`, { message });
    },
    onSuccess: () => {
      toast({
        title: "Bid declined",
        description: "The bid has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "bids"] });
      setShowDeclineDialog(false);
      setSelectedBid(null);
      setDeclineMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to decline bid",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const shortlistMutation = useMutation({
    mutationFn: async (bidId: string) => {
      return await apiRequest("POST", `/api/bids/${bidId}/shortlist`, {});
    },
    onSuccess: () => {
      toast({
        title: "Added to shortlist",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "shortlist"] });
    },
  });

  const removeShortlistMutation = useMutation({
    mutationFn: async (bidId: string) => {
      return await apiRequest("DELETE", `/api/bids/${bidId}/shortlist`, {});
    },
    onSuccess: () => {
      toast({
        title: "Removed from shortlist",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "shortlist"] });
    },
  });

  const trackViewMutation = useMutation({
    mutationFn: async (bidId: string) => {
      return await apiRequest("POST", `/api/bids/${bidId}/view`, {
        viewDuration: 0,
        source: "bid_management",
      });
    },
  });

  const trackComparisonMutation = useMutation({
    mutationFn: async (bidIds: string[]) => {
      return await apiRequest("POST", `/api/bids/compare`, { bidIds });
    },
  });

  const handleViewBid = (bid: BidWithDetails) => {
    setSelectedBid(bid);
    trackViewMutation.mutate(bid.id);
  };

  const isShortlisted = (bidId: string) => {
    return shortlistedBids.some(b => b.id === bidId);
  };

  const toggleCompare = (bidId: string) => {
    if (compareBids.includes(bidId)) {
      setCompareBids(compareBids.filter(id => id !== bidId));
    } else {
      if (compareBids.length < 5) {
        setCompareBids([...compareBids, bidId]);
      } else {
        toast({
          title: "Maximum 5 bids",
          description: "You can compare up to 5 bids at a time.",
          variant: "destructive",
        });
      }
    }
  };

  const viewComparison = () => {
    if (compareBids.length >= 2) {
      trackComparisonMutation.mutate(compareBids);
      // Open comparison view (would be a separate component)
      toast({
        title: "Comparison view",
        description: "Comparing selected bids...",
      });
    }
  };

  const renderBidCard = (bid: BidWithDetails) => (
    <Card key={bid.id} className="hover-elevate" data-testid={`card-bid-${bid.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg" data-testid={`text-consultant-${bid.id}`}>
              {bid.consultant?.companyName || `${bid.consultant?.firstName} ${bid.consultant?.lastName}`}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {bid.consultant?.avgRating && (
                <div className="flex items-center gap-1" data-testid={`rating-${bid.id}`}>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{bid.consultant.avgRating.toFixed(1)}</span>
                </div>
              )}
              <span className="text-muted-foreground">
                {bid.consultant?.completedProjects || 0} projects completed
              </span>
            </CardDescription>
          </div>
          <Badge
            variant={
              bid.status === "accepted" ? "default" :
              bid.status === "declined" ? "destructive" :
              "secondary"
            }
            data-testid={`badge-status-${bid.id}`}
          >
            {bid.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2" data-testid={`budget-${bid.id}`}>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">﷼{parseFloat(bid.proposedBudget).toLocaleString()}</span>
          </div>
          {bid.proposedDuration && (
            <div className="flex items-center gap-2" data-testid={`duration-${bid.id}`}>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{bid.proposedDuration}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>{bid.viewCount || 0} views</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" data-testid={`bid-type-${bid.id}`}>
            {bid.bidType === "service" && <Users className="h-3 w-3 mr-1" />}
            {bid.bidType === "hardware" && <Package className="h-3 w-3 mr-1" />}
            {bid.bidType === "software" && <Settings className="h-3 w-3 mr-1" />}
            {bid.bidType}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`cover-letter-${bid.id}`}>
          {bid.coverLetter}
        </p>

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewBid(bid)}
            data-testid={`button-view-${bid.id}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          
          {bid.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => acceptBidMutation.mutate(bid.id)}
                disabled={acceptBidMutation.isPending}
                data-testid={`button-accept-${bid.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setSelectedBid(bid);
                  setShowDeclineDialog(true);
                }}
                data-testid={`button-decline-${bid.id}`}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant={isShortlisted(bid.id) ? "default" : "outline"}
            onClick={() => {
              if (isShortlisted(bid.id)) {
                removeShortlistMutation.mutate(bid.id);
              } else {
                shortlistMutation.mutate(bid.id);
              }
            }}
            data-testid={`button-shortlist-${bid.id}`}
          >
            <Bookmark className="h-4 w-4 mr-2" />
            {isShortlisted(bid.id) ? "Shortlisted" : "Shortlist"}
          </Button>

          <Button
            size="sm"
            variant={compareBids.includes(bid.id) ? "default" : "outline"}
            onClick={() => toggleCompare(bid.id)}
            disabled={!compareBids.includes(bid.id) && compareBids.length >= 5}
            data-testid={`button-compare-${bid.id}`}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {compareBids.includes(bid.id) ? "Selected" : "Compare"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bids</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-[180px]" data-testid="select-sort-by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Most Recent</SelectItem>
              <SelectItem value="budget">Lowest Budget</SelectItem>
              <SelectItem value="rating">Highest Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {compareBids.length >= 2 && (
          <Button onClick={viewComparison} data-testid="button-view-comparison">
            <TrendingUp className="h-4 w-4 mr-2" />
            Compare {compareBids.length} Bids
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-bids">
            All Bids ({bids.length})
          </TabsTrigger>
          <TabsTrigger value="shortlisted" data-testid="tab-shortlisted">
            Shortlisted ({shortlistedBids.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {bids.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bids found for this job</p>
              </CardContent>
            </Card>
          ) : (
            bids.map(renderBidCard)
          )}
        </TabsContent>

        <TabsContent value="shortlisted" className="space-y-4">
          {shortlistedBids.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No shortlisted bids yet</p>
              </CardContent>
            </Card>
          ) : (
            shortlistedBids.map(renderBidCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent data-testid="dialog-decline-bid">
          <DialogHeader>
            <DialogTitle>Decline Bid</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this bid (optional)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for declining..."
            value={declineMessage}
            onChange={(e) => setDeclineMessage(e.target.value)}
            rows={4}
            data-testid="textarea-decline-message"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeclineDialog(false)}
              data-testid="button-cancel-decline"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedBid) {
                  declineBidMutation.mutate({
                    bidId: selectedBid.id,
                    message: declineMessage,
                  });
                }
              }}
              disabled={declineBidMutation.isPending}
              data-testid="button-confirm-decline"
            >
              Decline Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bid Details Dialog */}
      {selectedBid && !showDeclineDialog && (
        <Dialog open={!!selectedBid} onOpenChange={() => setSelectedBid(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-bid-details">
            <DialogHeader>
              <DialogTitle>Bid Details</DialogTitle>
              <DialogDescription>
                From {selectedBid.consultant?.companyName || `${selectedBid.consultant?.firstName} ${selectedBid.consultant?.lastName}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Proposed Budget</p>
                  <p className="text-2xl font-bold">﷼{parseFloat(selectedBid.proposedBudget).toLocaleString()}</p>
                </div>
                {selectedBid.proposedDuration && (
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold">{selectedBid.proposedDuration}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Cover Letter</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedBid.coverLetter}</p>
              </div>

              {selectedBid.proposalData && (
                <div>
                  <p className="text-sm font-medium mb-2">Proposal Details</p>
                  <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                    {JSON.stringify(selectedBid.proposalData, null, 2) as string}
                  </pre>
                </div>
              )}

              {selectedBid.milestones && Array.isArray(selectedBid.milestones) && selectedBid.milestones.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Milestones</p>
                  <div className="space-y-2">
                    {selectedBid.milestones.map((milestone: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <span className="text-sm">{milestone.description}</span>
                        <span className="text-sm font-semibold">﷼{milestone.payment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedBid(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
