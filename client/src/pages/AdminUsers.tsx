import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar } from "@/components/admin/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Ban, CheckCircle, Mail, CreditCard, Gift, Clock, XCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  engagementPlan: string;
  paymentStatus: string;
  approvalStatus: string;
  profileStatus: string;
  profileCompletion: number;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    userId: string | null;
  }>({
    open: false,
    action: 'approve',
    userId: null,
  });
  const [adminNotes, setAdminNotes] = useState("");

  // Mutations for approval/rejection
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/admin/users/${userId}/approve`, { notes: adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Approved",
        description: "The user has been approved successfully.",
      });
      setApprovalDialog({ open: false, action: 'approve', userId: null });
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/admin/users/${userId}/reject`, { reason: adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Rejected",
        description: "The user has been rejected.",
      });
      setApprovalDialog({ open: false, action: 'approve', userId: null });
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject user",
        variant: "destructive",
      });
    },
  });

  const handleApprovalAction = () => {
    if (!approvalDialog.userId) return;

    if (approvalDialog.action === 'reject' && !adminNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    if (approvalDialog.action === 'approve') {
      approveMutation.mutate(approvalDialog.userId);
    } else {
      rejectMutation.mutate(approvalDialog.userId);
    }
  };

  // Fetch users from API with proper query parameters
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/admin/users", filters, searchValue],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add filters to query params
      if (filters.role) params.set('role', filters.role);
      if (filters.status) params.set('status', filters.status);
      if (filters.verified) params.set('verified', filters.verified);
      
      // Server handles pagination, we fetch all for now (can add pagination later)
      params.set('limit', '1000');
      params.set('page', '1');
      
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
  });

  const users = data?.users || [];

  // Filter columns configuration
  const filterConfig = [
    {
      key: "role",
      label: t("users.filterByRole"),
      type: "select" as const,
      options: [
        { label: t("users.client"), value: "client" },
        { label: t("users.consultant"), value: "consultant" },
        { label: t("users.both"), value: "both" },
        { label: "Admin", value: "admin" },
      ],
    },
    {
      key: "status",
      label: t("users.filterByStatus"),
      type: "select" as const,
      options: [
        { label: t("common.active"), value: "active" },
        { label: t("common.inactive"), value: "inactive" },
        { label: "Suspended", value: "suspended" },
      ],
    },
    {
      key: "verified",
      label: t("users.filterByVerified"),
      type: "select" as const,
      options: [
        { label: "Verified", value: "true" },
        { label: "Not Verified", value: "false" },
      ],
    },
  ];

  // Table columns
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "email",
      header: t("users.email"),
      cell: ({ row }) => {
        const user = row.original;
        const fullName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : null;
        
        return (
          <div className="space-y-1">
            <div className="font-medium" data-testid={`email-${user.id}`}>
              {user.email}
            </div>
            {fullName && (
              <div className="text-sm text-muted-foreground" data-testid={`name-${user.id}`}>
                {fullName}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: t("users.role"),
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        const roleVariant: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
          admin: "destructive",
          client: "secondary",
          consultant: "default",
          both: "outline",
        };
        return (
          <Badge 
            variant={roleVariant[role] || "outline"}
            data-testid={`role-${row.original.id}`}
          >
            {t(`users.${role}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "engagementPlan",
      header: "Plan",
      cell: ({ row }) => {
        const plan = row.getValue("engagementPlan") as string;
        const planVariant: Record<string, "default" | "secondary" | "outline"> = {
          basic: "secondary",
          professional: "default",
          enterprise: "outline",
        };
        const planColors: Record<string, string> = {
          basic: "text-green-600",
          professional: "text-blue-600",
          enterprise: "text-purple-600",
        };
        return (
          <Badge 
            variant={planVariant[plan] || "outline"}
            className={planColors[plan]}
            data-testid={`plan-${row.original.id}`}
          >
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "profileStatus",
      header: "Profile Status",
      cell: ({ row }) => {
        const profileStatus = row.getValue("profileStatus") as string;
        const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          draft: "outline",
          submitted: "secondary",
          complete: "default",
          rejected: "destructive",
        };
        const statusColors: Record<string, string> = {
          draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
          submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          complete: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        };
        return (
          <Badge 
            variant={statusVariant[profileStatus] || "outline"}
            className={statusColors[profileStatus]}
            data-testid={`profile-status-${row.original.id}`}
          >
            {profileStatus.charAt(0).toUpperCase() + profileStatus.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "profileCompletion",
      header: "Completion",
      cell: ({ row }) => {
        const completion = row.getValue("profileCompletion") as number;
        const color = completion >= 80 ? "bg-green-500" : completion >= 50 ? "bg-yellow-500" : "bg-red-500";
        
        return (
          <div className="flex items-center gap-2" data-testid={`completion-${row.original.id}`}>
            <div className="w-16 bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${color}`}
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{completion}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "approvalStatus",
      header: "Approval",
      cell: ({ row }) => {
        const approvalStatus = row.getValue("approvalStatus") as string;
        const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          approved: "default",
          pending: "secondary",
          rejected: "destructive",
        };
        const statusColors: Record<string, string> = {
          approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        };
        return (
          <Badge 
            variant={statusVariant[approvalStatus] || "outline"}
            className={statusColors[approvalStatus]}
            data-testid={`approval-${row.original.id}`}
          >
            {approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const paymentStatus = row.getValue("paymentStatus") as string;
        const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          succeeded: "default",
          not_required: "secondary",
          pending: "outline",
          failed: "destructive",
        };
        
        const StatusIcon = ({ status }: { status: string }) => {
          switch (status) {
            case "succeeded":
              return <CreditCard className="h-3 w-3 mr-1" />;
            case "not_required":
              return <Gift className="h-3 w-3 mr-1" />;
            case "pending":
              return <Clock className="h-3 w-3 mr-1" />;
            case "failed":
              return <XCircle className="h-3 w-3 mr-1" />;
            default:
              return null;
          }
        };
        
        return (
          <Badge 
            variant={statusVariant[paymentStatus] || "outline"}
            className="flex items-center gap-1"
            data-testid={`payment-${row.original.id}`}
          >
            <StatusIcon status={paymentStatus} />
            {paymentStatus === "not_required" ? "Free" : 
             paymentStatus === "succeeded" ? "Paid" :
             paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("users.status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          active: "default",
          inactive: "secondary",
          suspended: "destructive",
        };
        return (
          <Badge 
            variant={statusVariant[status] || "outline"}
            data-testid={`status-${row.original.id}`}
          >
            {status === "suspended" ? t("users.suspended") : t(`common.${status}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "emailVerified",
      header: t("users.verified"),
      cell: ({ row }) => {
        const verified = row.getValue("emailVerified") as boolean;
        return (
          <div data-testid={`verified-${row.original.id}`}>
            {verified ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: t("users.registered"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <div 
            className="text-sm text-muted-foreground"
            data-testid={`created-${row.original.id}`}
          >
            {format(date, "MMM dd, yyyy")}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const user = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                data-testid={`button-actions-${user.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                data-testid={`action-view-${user.id}`}
                onClick={() => setLocation(`/users/${user.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {t("users.viewProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem data-testid={`action-message-${user.id}`}>
                <Mail className="mr-2 h-4 w-4" />
                {t("users.sendMessage")}
              </DropdownMenuItem>
              
              {user.approvalStatus === "pending" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    data-testid={`action-approve-${user.id}`}
                    onClick={() => {
                      setApprovalDialog({
                        open: true,
                        action: 'approve',
                        userId: user.id,
                      });
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    data-testid={`action-reject-${user.id}`}
                    className="text-destructive"
                    onClick={() => {
                      setApprovalDialog({
                        open: true,
                        action: 'reject',
                        userId: user.id,
                      });
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              {user.status === "active" ? (
                <DropdownMenuItem 
                  className="text-destructive"
                  data-testid={`action-suspend-${user.id}`}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {t("users.suspend")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem data-testid={`action-activate-${user.id}`}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("users.activate")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Client-side search filtering (role/status/verified are handled server-side)
  const filteredUsers = users.filter((user) => {
    if (!searchValue) return true;
    
    const searchLower = searchValue.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4 p-4">
      <AdminPageHeader
        title={t("users.title")}
        subtitle={t("users.subtitle")}
        testId="users"
      />

      <FilterBar
        searchPlaceholder={t("common.search")}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={filterConfig}
        onFiltersChange={setFilters}
        onReset={() => {
          setSearchValue("");
          setFilters({});
        }}
        showAdvancedFilters={true}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
      />

      {/* Approval/Rejection Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => {
        if (!open) {
          setApprovalDialog({ open: false, action: 'approve', userId: null });
          setAdminNotes("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === 'approve' ? 'Approve User' : 'Reject User'}
            </DialogTitle>
            <DialogDescription>
              {approvalDialog.action === 'approve' 
                ? 'This will approve the user account and grant access to the platform.' 
                : 'This will reject the user account. Please provide a reason for the rejection.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-notes">
                {approvalDialog.action === 'approve' ? 'Notes (Optional)' : 'Rejection Reason (Required)'}
              </Label>
              <Textarea
                id="admin-notes"
                placeholder={approvalDialog.action === 'approve' 
                  ? 'Add any notes about this approval...' 
                  : 'Explain why this account is being rejected...'}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialog({ open: false, action: 'approve', userId: null });
                setAdminNotes("");
              }}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={approvalDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleApprovalAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {approveMutation.isPending || rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {approvalDialog.action === 'approve' ? 'Approving...' : 'Rejecting...'}
                </>
              ) : (
                approvalDialog.action === 'approve' ? 'Approve' : 'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
