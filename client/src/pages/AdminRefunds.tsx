import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Eye, FileText } from "lucide-react";

interface RefundRequest {
  id: string;
  userId: string;
  escrowTransactionId: string | null;
  invoiceId: string | null;
  amount: string;
  currency: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string | null;
  createdAt: string;
  processedAt: string | null;
}

export default function AdminRefunds() {
  const { toast } = useToast();
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: refunds, isLoading } = useQuery<RefundRequest[]>({
    queryKey: ['/api/refunds', statusFilter],
  });

  const processRefundMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: 'approve' | 'reject'; notes: string }) => {
      const response = await fetch(`/api/refunds/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notes }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Failed to ${action} refund`);
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === 'approve' ? "Refund approved" : "Refund rejected",
        description: `The refund has been ${variables.action}d successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/refunds'] });
      setDetailDialogOpen(false);
      setSelectedRefund(null);
      setAdminNotes("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    }
  };

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toFixed(2)} SAR`;
  };

  const handleViewDetails = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setAdminNotes(refund.adminNotes || "");
    setDetailDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedRefund) {
      processRefundMutation.mutate({
        id: selectedRefund.id,
        action: 'approve',
        notes: adminNotes,
      });
    }
  };

  const handleReject = () => {
    if (selectedRefund) {
      processRefundMutation.mutate({
        id: selectedRefund.id,
        action: 'reject',
        notes: adminNotes,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4 mb-4">
        <AdminPageHeader
          title="Refund Requests"
          subtitle="Manage and process refund requests"
          testId="refunds"
          actions={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </div>

      {refunds && refunds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No refund requests</h3>
            <p className="text-muted-foreground text-center">
              There are no refund requests matching the selected filter
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {refunds?.map((refund) => (
            <Card key={refund.id} className="hover-elevate" data-testid={`card-refund-${refund.id}`}>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-xl">
                        Refund Request #{refund.id.slice(0, 8)}
                      </CardTitle>
                      <Badge className={getStatusColor(refund.status)} data-testid={`badge-status-${refund.id}`}>
                        {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      Requested: {new Date(refund.createdAt).toLocaleString('en-SA')}
                      {refund.processedAt && (
                        <> • Processed: {new Date(refund.processedAt).toLocaleString('en-SA')}</>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" data-testid={`text-amount-${refund.id}`}>
                      {formatCurrency(refund.amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {refund.currency}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-1">Reason:</h4>
                  <p className="text-sm text-muted-foreground">{refund.reason}</p>
                </div>
                {refund.adminNotes && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold text-sm mb-1">Admin Notes:</h4>
                    <p className="text-sm text-muted-foreground">{refund.adminNotes}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(refund)}
                    data-testid={`button-view-${refund.id}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  {refund.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleViewDetails(refund)}
                        data-testid={`button-process-${refund.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Process
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Refund Request Details</DialogTitle>
            <DialogDescription>
              Review and process this refund request
            </DialogDescription>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Request ID:</h4>
                  <p className="text-sm">{selectedRefund.id}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Amount:</h4>
                  <p className="text-lg font-bold">{formatCurrency(selectedRefund.amount)}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Status:</h4>
                  <Badge className={getStatusColor(selectedRefund.status)}>
                    {selectedRefund.status.charAt(0).toUpperCase() + selectedRefund.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Requested:</h4>
                  <p className="text-sm">{new Date(selectedRefund.createdAt).toLocaleString('en-SA')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">User Reason:</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {selectedRefund.reason}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin Notes {selectedRefund.status === 'pending' ? '(Required)' : ''}</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision"
                  rows={4}
                  disabled={selectedRefund.status !== 'pending'}
                  data-testid="input-admin-notes"
                />
              </div>

              {selectedRefund.status === 'pending' && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={!adminNotes.trim() || processRefundMutation.isPending}
                    data-testid="button-approve"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {processRefundMutation.isPending ? "Processing..." : "Approve Refund"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!adminNotes.trim() || processRefundMutation.isPending}
                    data-testid="button-reject"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {processRefundMutation.isPending ? "Processing..." : "Reject Refund"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      setAdminNotes("");
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
