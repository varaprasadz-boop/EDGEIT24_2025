import { useState } from "react";
import { useQuery, useMutation, queryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Dispute = {
  id: string;
  projectId: string;
  raisedBy: string;
  disputeType: string;
  title: string;
  description: string;
  desiredResolution?: string;
  status: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type DisputesResponse = {
  disputes: Dispute[];
  total: number;
};

const DISPUTE_STATUSES = ["pending", "under_review", "resolved", "closed"];
const DISPUTE_TYPES = ["payment_dispute", "quality_dispute", "delivery_dispute", "refund_request", "contract_violation"];

const disputeTypeLabels: Record<string, string> = {
  payment_dispute: "Payment",
  quality_dispute: "Quality",
  delivery_dispute: "Delivery",
  refund_request: "Refund",
  contract_violation: "Contract",
};

export default function AdminDisputes() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [newStatus, setNewStatus] = useState<string>("under_review");
  const [resolution, setResolution] = useState("");

  const statusFilter = filters.status || "all";
  const typeFilter = filters.disputeType || "all";

  const { data, isLoading } = useQuery<DisputesResponse>({
    queryKey: ['/api/admin/disputes', pagination.pageIndex, pagination.pageSize, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pagination.pageSize.toString(),
        offset: (pagination.pageIndex * pagination.pageSize).toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { disputeType: typeFilter }),
      });
      
      const res = await fetch(`/api/admin/disputes?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch disputes');
      }
      
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ disputeId, status, resolution }: { disputeId: string; status: string; resolution?: string }) => {
      return apiRequest(`/api/admin/disputes/${disputeId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, resolution }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/disputes'] });
      toast({
        title: "Status Updated",
        description: "Dispute status has been updated successfully.",
      });
      setResolveDialogOpen(false);
      setSelectedDispute(null);
      setResolution("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleFiltersChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const handleResolve = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setNewStatus(dispute.status === 'pending' ? 'under_review' : 'resolved');
    setResolution(dispute.resolution || "");
    setResolveDialogOpen(true);
  };

  const handleSubmitStatusUpdate = () => {
    if (!selectedDispute) return;
    
    updateStatusMutation.mutate({
      disputeId: selectedDispute.id,
      status: newStatus,
      resolution: resolution.trim() || undefined,
    });
  };

  const getStatusVariant = (status: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (status) {
      case "pending":
        return "destructive";
      case "under_review":
        return "outline";
      case "resolved":
        return "default";
      case "closed":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const columns: ColumnDef<Dispute>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="max-w-md">
          <div className="font-medium" data-testid={`text-title-${row.original.id}`}>
            {row.original.title}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {row.original.description.substring(0, 100)}...
          </div>
        </div>
      ),
    },
    {
      accessorKey: "disputeType",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" data-testid={`badge-type-${row.original.id}`}>
          {disputeTypeLabels[row.original.disputeType] || row.original.disputeType}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)} data-testid={`badge-status-${row.original.id}`}>
          {row.original.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span data-testid={`text-date-${row.original.id}`}>
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${row.original.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleResolve(row.original)} data-testid={`action-update-${row.original.id}`}>
              Update Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filterConfigs: FilterConfig[] = [
    {
      id: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "All", value: "all" },
        { label: "Pending", value: "pending" },
        { label: "Under Review", value: "under_review" },
        { label: "Resolved", value: "resolved" },
        { label: "Closed", value: "closed" },
      ],
    },
    {
      id: "disputeType",
      label: "Type",
      type: "select",
      options: [
        { label: "All", value: "all" },
        { label: "Payment", value: "payment_dispute" },
        { label: "Quality", value: "quality_dispute" },
        { label: "Delivery", value: "delivery_dispute" },
        { label: "Refund", value: "refund_request" },
        { label: "Contract", value: "contract_violation" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="title-admin-disputes">
          Dispute Management
        </h2>
        <p className="text-muted-foreground">
          Review and manage user disputes
        </p>
      </div>

      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        filterConfigs={filterConfigs}
      />

      <DataTable
        columns={columns}
        data={data?.disputes || []}
        loading={isLoading}
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={Math.ceil((data?.total || 0) / pagination.pageSize)}
        emptyMessage="No disputes found"
      />

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Dispute Status</DialogTitle>
            <DialogDescription>
              Change the status and add a resolution note for this dispute.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Note (Optional)</label>
              <Textarea
                placeholder="Add a note about the resolution..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-resolution"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitStatusUpdate} 
              disabled={updateStatusMutation.isPending}
              data-testid="button-submit"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
