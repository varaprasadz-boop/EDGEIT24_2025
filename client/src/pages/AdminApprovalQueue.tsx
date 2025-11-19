import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { AdminLayout } from "@/components/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar } from "@/components/admin/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Info, MoreHorizontal, AlertTriangle, Eye, FileText, Download, Clock } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PendingUser {
  id: string;
  email: string;
  role: string;
  accountStatus: string;
  createdAt: string;
  riskScore: number;
  approvalNotes?: string;
  rejectionReason?: string;
  requestedInfoDetails?: string;
}

interface ApprovalQueueResponse {
  users: PendingUser[];
  total: number;
}

interface KycDocument {
  id: string;
  userId: string;
  profileType: 'client' | 'consultant';
  documentType: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  commercial_registration: 'Commercial Registration',
  tax_certificate: 'Tax Certificate (VAT)',
  national_id: 'National ID',
  authorization_letter: 'Authorization Letter',
  business_license: 'Business License',
  other: 'Other Document',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function AdminApprovalQueue() {
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'pending_approval'
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'requestInfo' | 'bulkApprove' | 'bulkReject' | null;
    userId?: string;
  }>({ open: false, action: null });
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [infoDetails, setInfoDetails] = useState("");
  const [userDetailsDialog, setUserDetailsDialog] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  const [docReviewNotes, setDocReviewNotes] = useState("");

  // Fetch pending users
  const { data, isLoading } = useQuery<ApprovalQueueResponse>({
    queryKey: ["/api/admin/users/pending", filters, searchValue, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.status) params.set('status', filters.status);
      if (filters.role) params.set('role', filters.role);
      if (searchValue) params.set('search', searchValue);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('limit', '100');
      params.set('offset', '0');
      
      const response = await fetch(`/api/admin/users/pending?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending users');
      }
      
      return response.json();
    },
  });

  const users = data?.users || [];

  // Fetch KYC documents for user details
  const { data: kycDocuments = [], isLoading: kycLoading, refetch: refetchKycDocs } = useQuery<KycDocument[]>({
    queryKey: ["/api/admin/users", userDetailsDialog.userId, "kyc-documents"],
    queryFn: async () => {
      if (!userDetailsDialog.userId) return [];
      const response = await fetch(`/api/admin/users/${userDetailsDialog.userId}/kyc-documents`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch KYC documents');
      return response.json();
    },
    enabled: userDetailsDialog.open && !!userDetailsDialog.userId,
  });

  // Update KYC document status mutation
  const updateKycStatusMutation = useMutation({
    mutationFn: async ({ docId, status, reviewNotes }: { docId: string; status: 'approved' | 'rejected'; reviewNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/kyc-documents/${docId}/status`, { status, reviewNotes });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update document status');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchKycDocs();
      toast({
        title: "Document Updated",
        description: "Document status has been updated successfully.",
      });
      setDocReviewNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async ({ userId, notes }: { userId: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/approve`, { notes });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      toast({
        title: "User Approved",
        description: "User account has been approved successfully.",
      });
      setActionDialog({ open: false, action: null });
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reject`, { reason });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      toast({
        title: "User Rejected",
        description: "User account has been rejected.",
      });
      setActionDialog({ open: false, action: null });
      setReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Request info mutation
  const requestInfoMutation = useMutation({
    mutationFn: async ({ userId, details }: { userId: string; details: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/request-info`, { details });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to request info');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      toast({
        title: "Info Requested",
        description: "Additional information has been requested from the user.",
      });
      setActionDialog({ open: false, action: null });
      setInfoDetails("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, userIds, notes, reason }: { 
      action: 'approve' | 'reject'; 
      userIds: string[]; 
      notes?: string; 
      reason?: string; 
    }) => {
      const response = await apiRequest("POST", `/api/admin/users/bulk-action`, { 
        action, 
        userIds, 
        notes, 
        reason 
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to perform bulk action');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      toast({
        title: "Bulk Action Complete",
        description: "Selected users have been processed.",
      });
      setActionDialog({ open: false, action: null });
      setSelectedUsers([]);
      setNotes("");
      setReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAction = () => {
    const { action, userId } = actionDialog;
    
    if (action === 'approve' && userId) {
      approveMutation.mutate({ userId, notes });
    } else if (action === 'reject' && userId) {
      if (!reason.trim()) {
        toast({
          title: "Error",
          description: "Rejection reason is required",
          variant: "destructive",
        });
        return;
      }
      rejectMutation.mutate({ userId, reason });
    } else if (action === 'requestInfo' && userId) {
      if (!infoDetails.trim()) {
        toast({
          title: "Error",
          description: "Info request details are required",
          variant: "destructive",
        });
        return;
      }
      requestInfoMutation.mutate({ userId, details: infoDetails });
    } else if (action === 'bulkApprove') {
      bulkActionMutation.mutate({ action: 'approve', userIds: selectedUsers, notes });
    } else if (action === 'bulkReject') {
      if (!reason.trim()) {
        toast({
          title: "Error",
          description: "Rejection reason is required",
          variant: "destructive",
        });
        return;
      }
      bulkActionMutation.mutate({ action: 'reject', userIds: selectedUsers, reason });
    }
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 70) return "destructive";
    if (score >= 40) return "default";
    return "secondary";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return "High Risk";
    if (score >= 40) return "Medium Risk";
    return "Low Risk";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="outline">Pending Approval</Badge>;
      case 'pending_info':
        return <Badge variant="default">Info Requested</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter columns configuration
  const filterConfig = [
    {
      key: "status",
      label: "Status",
      type: "select" as const,
      options: [
        { label: "Pending Approval", value: "pending_approval" },
        { label: "Info Requested", value: "pending_info" },
        { label: "Rejected", value: "rejected" },
      ],
    },
    {
      key: "role",
      label: "Role",
      type: "select" as const,
      options: [
        { label: "Client", value: "client" },
        { label: "Consultant", value: "consultant" },
      ],
    },
  ];

  // Table columns
  const columns: ColumnDef<PendingUser>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={selectedUsers.length === users.length && users.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUsers(users.map(u => u.id));
            } else {
              setSelectedUsers([]);
            }
          }}
          data-testid="checkbox-select-all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedUsers.includes(row.original.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUsers([...selectedUsers, row.original.id]);
            } else {
              setSelectedUsers(selectedUsers.filter(id => id !== row.original.id));
            }
          }}
          data-testid={`checkbox-user-${row.original.id}`}
        />
      ),
    },
    {
      accessorKey: "email",
      header: "User",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.email}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.role === 'client' ? 'Client' : 'Consultant'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "accountStatus",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.accountStatus),
    },
    {
      accessorKey: "riskScore",
      header: () => (
        <button
          onClick={() => {
            if (sortBy === 'riskScore') {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy('riskScore');
              setSortOrder('desc');
            }
          }}
          className="flex items-center gap-1 font-medium"
          data-testid="button-sort-risk"
        >
          Risk Score
          {sortBy === 'riskScore' && (
            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={getRiskBadgeColor(row.original.riskScore)}>
            {row.original.riskScore}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {getRiskLabel(row.original.riskScore)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <button
          onClick={() => {
            if (sortBy === 'createdAt') {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy('createdAt');
              setSortOrder('desc');
            }
          }}
          className="flex items-center gap-1 font-medium"
          data-testid="button-sort-date"
        >
          Registered
          {sortBy === 'createdAt' && (
            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      ),
      cell: ({ row }) => format(new Date(row.original.createdAt), "PPp"),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-actions-${user.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setUserDetailsDialog({ open: true, userId: user.id })}
                data-testid={`action-viewdetails-${user.id}`}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActionDialog({ open: true, action: 'approve', userId: user.id })}
                data-testid={`action-approve-${user.id}`}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActionDialog({ open: true, action: 'reject', userId: user.id })}
                data-testid={`action-reject-${user.id}`}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActionDialog({ open: true, action: 'requestInfo', userId: user.id })}
                data-testid={`action-requestinfo-${user.id}`}
              >
                <Info className="mr-2 h-4 w-4" />
                Request Info
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Approval Queue</h1>
          <p className="text-muted-foreground">
            Review and approve pending user accounts
          </p>
        </div>

        <FilterBar
          filters={filterConfig}
          onFiltersChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
          searchPlaceholder="Search users..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />

        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <span className="font-medium">{selectedUsers.length} users selected</span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="default"
                onClick={() => setActionDialog({ open: true, action: 'bulkApprove' })}
                data-testid="button-bulk-approve"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Selected
              </Button>
              <Button
                variant="destructive"
                onClick={() => setActionDialog({ open: true, action: 'bulkReject' })}
                data-testid="button-bulk-reject"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Selected
              </Button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
        />

        <Dialog open={actionDialog.open} onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, action: null });
            setNotes("");
            setReason("");
            setInfoDetails("");
          }
        }}>
          <DialogContent data-testid="dialog-action">
            <DialogHeader>
              <DialogTitle>
                {actionDialog.action === 'approve' && 'Approve User'}
                {actionDialog.action === 'reject' && 'Reject User'}
                {actionDialog.action === 'requestInfo' && 'Request Information'}
                {actionDialog.action === 'bulkApprove' && `Approve ${selectedUsers.length} Users`}
                {actionDialog.action === 'bulkReject' && `Reject ${selectedUsers.length} Users`}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.action === 'approve' && 'The user will be notified and granted full access to the platform.'}
                {actionDialog.action === 'reject' && 'The user will be notified with the rejection reason.'}
                {actionDialog.action === 'requestInfo' && 'The user will be notified to provide additional information.'}
                {actionDialog.action === 'bulkApprove' && 'All selected users will be approved and notified.'}
                {actionDialog.action === 'bulkReject' && 'All selected users will be rejected and notified.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {(actionDialog.action === 'approve' || actionDialog.action === 'bulkApprove') && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Approval Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this approval..."
                    data-testid="textarea-notes"
                  />
                </div>
              )}

              {(actionDialog.action === 'reject' || actionDialog.action === 'bulkReject') && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Rejection Reason *</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why the account is being rejected..."
                    required
                    data-testid="textarea-reason"
                  />
                </div>
              )}

              {actionDialog.action === 'requestInfo' && (
                <div className="space-y-2">
                  <Label htmlFor="infoDetails">Information Request *</Label>
                  <Textarea
                    id="infoDetails"
                    value={infoDetails}
                    onChange={(e) => setInfoDetails(e.target.value)}
                    placeholder="Specify what information is needed..."
                    required
                    data-testid="textarea-info"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ open: false, action: null })}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={
                  approveMutation.isPending ||
                  rejectMutation.isPending ||
                  requestInfoMutation.isPending ||
                  bulkActionMutation.isPending
                }
                data-testid="button-confirm"
              >
                {(approveMutation.isPending || bulkActionMutation.isPending) && 'Processing...'}
                {rejectMutation.isPending && 'Rejecting...'}
                {requestInfoMutation.isPending && 'Requesting...'}
                {!approveMutation.isPending && 
                 !rejectMutation.isPending && 
                 !requestInfoMutation.isPending && 
                 !bulkActionMutation.isPending && 
                 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog 
          open={userDetailsDialog.open} 
          onOpenChange={(open) => {
            if (!open) {
              setUserDetailsDialog({ open: false, userId: null });
              setDocReviewNotes("");
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-user-details">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                User Details & KYC Documents
              </DialogTitle>
              <DialogDescription>
                Review user information and uploaded verification documents
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {userDetailsDialog.userId && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">User Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const user = users.find(u => u.id === userDetailsDialog.userId);
                        if (!user) return <p className="text-muted-foreground">Loading user information...</p>;
                        return (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-muted-foreground">Email</p>
                              <p className="font-medium">{user.email}</p>
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground">Role</p>
                              <p className="capitalize">{user.role}</p>
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground">Status</p>
                              <div className="mt-1">{getStatusBadge(user.accountStatus)}</div>
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground">Risk Score</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getRiskBadgeColor(user.riskScore)}>
                                  {user.riskScore}
                                </Badge>
                                <span className="text-sm">{getRiskLabel(user.riskScore)}</span>
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground">Registered</p>
                              <p>{format(new Date(user.createdAt), "PPp")}</p>
                            </div>
                            {user.rejectionReason && (
                              <div className="col-span-2">
                                <p className="font-medium text-muted-foreground">Rejection Reason</p>
                                <p className="text-destructive">{user.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        KYC Documents ({kycDocuments.length})
                      </CardTitle>
                      <CardDescription>
                        Uploaded verification documents
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {kycLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : kycDocuments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No documents uploaded yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {kycDocuments.map((doc) => (
                            <div
                              key={doc.id}
                              className="p-4 border rounded-md space-y-3 hover-elevate"
                              data-testid={`kyc-doc-${doc.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <h4 className="font-medium">{doc.originalName}</h4>
                                    <Badge variant={
                                      doc.status === 'approved' ? 'default' : 
                                      doc.status === 'rejected' ? 'destructive' : 
                                      'secondary'
                                    }>
                                      {doc.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                      {doc.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                                      {doc.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Type: {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}</p>
                                    <p>Size: {formatFileSize(doc.size)} • Uploaded: {format(new Date(doc.createdAt), 'MMM d, yyyy')}</p>
                                  </div>
                                  {doc.reviewNotes && (
                                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                                      <p className="font-medium">Review Notes:</p>
                                      <p className="text-muted-foreground">{doc.reviewNotes}</p>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/admin/kyc-documents/${doc.id}/download`, '_blank')}
                                  data-testid={`button-download-${doc.id}`}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>

                              {doc.status === 'pending' && (
                                <div className="pt-3 border-t space-y-3">
                                  <div className="space-y-2">
                                    <Label htmlFor={`review-notes-${doc.id}`}>Review Notes (Optional)</Label>
                                    <Textarea
                                      id={`review-notes-${doc.id}`}
                                      value={docReviewNotes}
                                      onChange={(e) => setDocReviewNotes(e.target.value)}
                                      placeholder="Add notes about this document..."
                                      className="min-h-[60px]"
                                      data-testid={`textarea-review-notes-${doc.id}`}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateKycStatusMutation.mutate({ 
                                        docId: doc.id, 
                                        status: 'approved', 
                                        reviewNotes: docReviewNotes 
                                      })}
                                      disabled={updateKycStatusMutation.isPending}
                                      data-testid={`button-approve-doc-${doc.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => updateKycStatusMutation.mutate({ 
                                        docId: doc.id, 
                                        status: 'rejected', 
                                        reviewNotes: docReviewNotes 
                                      })}
                                      disabled={updateKycStatusMutation.isPending}
                                      data-testid={`button-reject-doc-${doc.id}`}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUserDetailsDialog({ open: false, userId: null })}
                data-testid="button-close-details"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
