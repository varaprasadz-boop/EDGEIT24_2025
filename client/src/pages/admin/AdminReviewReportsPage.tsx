import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, XCircle, Eye, Filter, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ReviewReport, Review } from "@shared/schema";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface ReportWithReview extends ReviewReport {
  review?: Review;
}

export default function AdminReviewReportsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedReport, setSelectedReport] = useState<ReportWithReview | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState<string>("");

  const { data: reports, isLoading } = useQuery<ReviewReport[]>({
    queryKey: ['/api/admin/review-reports', { status: statusFilter }],
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: string; status: string; notes: string }) => {
      return apiRequest('PUT', `/api/admin/review-reports/${reportId}`, {
        status,
        adminNotes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Report resolved",
        description: "The review report has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/review-reports'] });
      setSelectedReport(null);
      setAdminNotes("");
      setResolutionStatus("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to resolve report",
        description: error.message,
      });
    },
  });

  const handleResolve = () => {
    if (!selectedReport || !resolutionStatus) return;
    
    resolveMutation.mutate({
      reportId: selectedReport.id,
      status: resolutionStatus,
      notes: adminNotes,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'reviewed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'dismissed':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Dismissed</Badge>;
      case 'resolved':
        return <Badge><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      spam: "Spam or fake review",
      inappropriate: "Inappropriate content",
      misleading: "Misleading or false information",
      harassment: "Harassment or abuse",
      conflict: "Conflict of interest",
      other: "Other",
    };
    return labels[reason] || reason;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-pulse text-muted-foreground">
              Loading reports...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="page-admin-review-reports">
      <AdminPageHeader
        title="Review Reports"
        subtitle="Manage reported reviews and maintain platform quality"
        testId="review-reports"
      />

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold" data-testid="stat-pending">
                  {reports?.filter(r => r.status === 'pending').length || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="text-2xl font-bold">
                  {reports?.filter(r => r.status === 'reviewed').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dismissed</p>
                <p className="text-2xl font-bold">
                  {reports?.filter(r => r.status === 'dismissed').length || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">
                  {reports?.filter(r => r.status === 'resolved').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filter Reports</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reports</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {(!reports || reports.length === 0) ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No reports found
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} data-testid={`card-report-${report.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-destructive" />
                      <span className="font-semibold">{getReasonLabel(report.reason)}</span>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reported {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                      {report.reviewedAt && ` • Reviewed ${formatDistanceToNow(new Date(report.reviewedAt), { addSuffix: true })}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReport(report)}
                    data-testid={`button-view-${report.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{report.description}</p>
                {report.adminNotes && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes:</p>
                    <p className="text-sm">{report.adminNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-report-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Report Details
            </DialogTitle>
            <DialogDescription>
              Review the reported content and take appropriate action
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Report Reason</Label>
                <p className="text-sm mt-1">{getReasonLabel(selectedReport.reason)}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Reporter's Description</Label>
                <p className="text-sm mt-1">{selectedReport.description}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Current Status</Label>
                <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
              </div>

              {selectedReport.status === 'pending' && (
                <>
                  <div>
                    <Label className="text-sm font-medium">Resolution Action</Label>
                    <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
                      <SelectTrigger className="mt-1" data-testid="select-resolution">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reviewed">Mark as Reviewed</SelectItem>
                        <SelectItem value="dismissed">Dismiss Report</SelectItem>
                        <SelectItem value="resolved">Mark as Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Admin Notes (Optional)</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add any notes about this resolution..."
                      className="mt-1"
                      data-testid="textarea-admin-notes"
                    />
                  </div>
                </>
              )}

              {selectedReport.adminNotes && (
                <div>
                  <Label className="text-sm font-medium">Previous Admin Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedReport.adminNotes}</p>
                </div>
              )}
            </div>
          )}

          {selectedReport?.status === 'pending' && (
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setSelectedReport(null)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResolve}
                disabled={!resolutionStatus || resolveMutation.isPending}
                data-testid="button-resolve"
              >
                {resolveMutation.isPending ? "Resolving..." : "Resolve Report"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
