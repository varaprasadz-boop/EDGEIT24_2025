import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  CheckCircle,
  XCircle,
  Lock,
  User,
  Award,
  Clock,
  AlertCircle,
  Loader2,
  Briefcase,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CategoryRequest {
  id: string;
  vendorId: string;
  categoryId: string;
  status: string;
  yearsOfExperience?: number;
  reasonForRequest?: string;
  adminNotes?: string;
  verificationBadge?: string;
  maxConcurrentJobs?: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  consultant?: {
    fullName: string;
    title: string;
    email: string;
    yearsOfExperience: number;
  };
}

interface CategoryRequestsData {
  pending: CategoryRequest[];
  approved: CategoryRequest[];
  rejected: CategoryRequest[];
}

type ActionType = 'approve' | 'reject';

export default function AdminCategoryRequests() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<CategoryRequest | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [verificationBadge, setVerificationBadge] = useState<string>("verified");
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState<number>(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<CategoryRequestsData>({
    queryKey: ["/api/category-requests", "admin"],
    queryFn: async () => {
      const res = await fetch('/api/category-requests?status=all', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
      }
      const result = await res.json();
      
      const grouped: CategoryRequestsData = {
        pending: result.requests?.filter((r: CategoryRequest) => r.status === 'pending') || [],
        approved: result.requests?.filter((r: CategoryRequest) => r.status === 'approved') || [],
        rejected: result.requests?.filter((r: CategoryRequest) => r.status === 'rejected') || [],
      };
      
      return grouped;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ 
      requestId, 
      verificationBadge, 
      maxConcurrentJobs, 
      adminNotes 
    }: { 
      requestId: string; 
      verificationBadge: string; 
      maxConcurrentJobs: number; 
      adminNotes?: string;
    }) => {
      return apiRequest(
        'PATCH',
        `/api/category-requests/${requestId}/approve`,
        { verificationBadge, maxConcurrentJobs, adminNotes }
      );
    },
    onSuccess: () => {
      toast({
        title: "Request Approved",
        description: "Category access granted with verification badge.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/category-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/category-requests", "admin"] });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      setVerificationBadge("verified");
      setMaxConcurrentJobs(10);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve request. Please try again.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ 
      requestId, 
      adminNotes 
    }: { 
      requestId: string; 
      adminNotes: string;
    }) => {
      return apiRequest(
        'PATCH',
        `/api/category-requests/${requestId}/reject`,
        { adminNotes }
      );
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "Category access request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/category-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/category-requests", "admin"] });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject request. Please try again.",
      });
    },
  });

  const handleAction = (request: CategoryRequest, action: ActionType) => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes("");
    if (action === 'approve') {
      setVerificationBadge("verified");
      setMaxConcurrentJobs(10);
    }
    setIsDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === 'approve') {
      approveMutation.mutate({
        requestId: selectedRequest.id,
        verificationBadge,
        maxConcurrentJobs,
        adminNotes: adminNotes || undefined,
      });
    } else {
      if (!adminNotes.trim()) {
        toast({
          variant: "destructive",
          title: "Admin notes required",
          description: "Please provide a reason for rejection.",
        });
        return;
      }
      rejectMutation.mutate({
        requestId: selectedRequest.id,
        adminNotes,
      });
    }
  };

  const renderRequestCard = (request: CategoryRequest, index: number, tabType: string) => {
    const statusVariant = 
      request.status === 'approved' ? 'default' :
      request.status === 'rejected' ? 'destructive' :
      'outline';

    return (
      <Card key={request.id} className="hover-elevate" data-testid={`request-card-${tabType}-${index}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base" data-testid={`request-title-${index}`}>
                  Category Access Request
                </CardTitle>
                <Badge variant={statusVariant} data-testid={`request-status-${index}`}>
                  {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                  {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
                {request.verificationBadge && (
                  <Badge variant="secondary" data-testid={`request-badge-${index}`}>
                    <Award className="h-3 w-3 mr-1" />
                    {request.verificationBadge.charAt(0).toUpperCase() + request.verificationBadge.slice(1)}
                  </Badge>
                )}
              </div>
              <CardDescription data-testid={`request-consultant-${index}`}>
                <User className="h-3 w-3 inline mr-1" />
                {request.consultant?.fullName || 'Unknown'} - {request.consultant?.title || 'Consultant'}
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground" data-testid={`request-time-${index}`}>
              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.consultant && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{request.consultant.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Experience:</span>
                <p className="font-medium">{request.yearsOfExperience || 0} years</p>
              </div>
            </div>
          )}

          {request.reasonForRequest && (
            <div>
              <Label className="text-sm font-medium">Reason for Request</Label>
              <p className="text-sm text-muted-foreground mt-1 p-3 rounded-md border bg-muted/50">
                {request.reasonForRequest}
              </p>
            </div>
          )}

          {request.adminNotes && (
            <div>
              <Label className="text-sm font-medium">Admin Notes</Label>
              <p className="text-sm text-muted-foreground mt-1 p-3 rounded-md border bg-muted/50">
                {request.adminNotes}
              </p>
            </div>
          )}

          {request.maxConcurrentJobs !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Max Concurrent Jobs:</span>
              <Badge variant="outline">{request.maxConcurrentJobs}</Badge>
            </div>
          )}

          {request.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAction(request, 'approve')}
                data-testid={`button-approve-${index}`}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAction(request, 'reject')}
                data-testid={`button-reject-${index}`}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading category requests...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to Load Requests
            </CardTitle>
            <CardDescription>
              Unable to fetch category access requests. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} data-testid="button-retry">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <AdminPageHeader
        title="Category Access Requests"
        subtitle="Review and approve consultant requests for specialized category access"
        testId="category-requests"
      />

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList data-testid="tabs-requests">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({data?.pending.length || 0})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({data?.approved.length || 0})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected ({data?.rejected.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {data?.pending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-pending">
                  No pending requests
                </p>
              </CardContent>
            </Card>
          ) : (
            data?.pending.map((request, index) => renderRequestCard(request, index, 'pending'))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {data?.approved.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-approved">
                  No approved requests
                </p>
              </CardContent>
            </Card>
          ) : (
            data?.approved.map((request, index) => renderRequestCard(request, index, 'approved'))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {data?.rejected.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-rejected">
                  No rejected requests
                </p>
              </CardContent>
            </Card>
          ) : (
            data?.rejected.map((request, index) => renderRequestCard(request, index, 'rejected'))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-action">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Category Access Request
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Grant this consultant access to the category with a verification badge.' 
                : 'Reject this request and provide a reason.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'approve' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="verification-badge">
                    Verification Badge <span className="text-destructive">*</span>
                  </Label>
                  <Select value={verificationBadge} onValueChange={setVerificationBadge}>
                    <SelectTrigger id="verification-badge" data-testid="select-badge">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-jobs">
                    Max Concurrent Jobs <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="max-jobs"
                    type="number"
                    min="1"
                    max="100"
                    value={maxConcurrentJobs}
                    onChange={(e) => setMaxConcurrentJobs(parseInt(e.target.value))}
                    data-testid="input-max-jobs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of concurrent jobs consultant can take in this category (1-100)
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-notes">
                Admin Notes {actionType === 'reject' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="admin-notes"
                placeholder={actionType === 'approve' 
                  ? "Optional notes about this approval..." 
                  : "Explain why this request is being rejected..."}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                data-testid="textarea-admin-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedRequest(null);
                setAdminNotes("");
              }}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirmAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid="button-confirm"
            >
              {approveMutation.isPending || rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'approve' ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Request
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject Request
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
