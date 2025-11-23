import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar } from "@/components/admin/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Edit, Trash2, Plus, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlanForm } from "@/components/admin/PlanForm";

interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string | null;
  audience: string;
  description: string | null;
  descriptionAr: string | null;
  price: string;
  currency: string;
  billingCycle: string;
  status: string;
  featured: boolean;
  popular: boolean;
  displayOrder: number;
  createdAt: string;
}

export default function AdminSubscriptionPlans() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  // Fetch subscription plans from API
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/subscription-plans", filters, searchValue, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      if (filters.audience) params.append('audience', filters.audience);
      if (filters.status) params.append('status', filters.status);
      if (searchValue.trim()) params.append('search', searchValue.trim());
      params.append('page', (pagination.pageIndex + 1).toString());
      params.append('limit', pagination.pageSize.toString());
      
      const url = `/api/admin/subscription-plans?${params.toString()}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  const plans = data?.plans || [];
  const pageCount = data?.totalPages || 0;

  // Clamp pagination when total pages changes (e.g., after filtering)
  useEffect(() => {
    if (pageCount === 0 && pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
    } else if (pageCount > 0 && pagination.pageIndex >= pageCount) {
      setPagination(prev => ({ ...prev, pageIndex: Math.max(0, pageCount - 1) }));
    }
  }, [pageCount, pagination.pageIndex]);

  // Filter columns configuration
  const filterConfig = [
    {
      key: "audience",
      label: t("subscriptionPlans.filterByAudience"),
      type: "select" as const,
      options: [
        { label: t("subscriptionPlans.client"), value: "client" },
        { label: t("subscriptionPlans.consultant"), value: "consultant" },
        { label: t("subscriptionPlans.both"), value: "both" },
      ],
    },
    {
      key: "status",
      label: t("subscriptionPlans.filterByStatus"),
      type: "select" as const,
      options: [
        { label: t("common.active"), value: "active" },
        { label: t("common.inactive"), value: "inactive" },
        { label: t("subscriptionPlans.archived"), value: "archived" },
      ],
    },
  ];

  // Table columns
  const columns: ColumnDef<SubscriptionPlan>[] = [
    {
      accessorKey: "displayOrder",
      header: "#",
      cell: ({ row }) => (
        <div
          className="text-sm text-muted-foreground"
          data-testid={`order-${row.original.id}`}
        >
          {row.original.displayOrder}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: t("subscriptionPlans.planName"),
      cell: ({ row }) => {
        const plan = row.original;
        const displayName = i18n.language === 'ar' && plan.nameAr 
          ? plan.nameAr 
          : plan.name;
        
        return (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2" data-testid={`name-${plan.id}`}>
              {displayName}
              {plan.featured && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
              {plan.popular && (
                <Star className="h-3 w-3 text-blue-500 fill-blue-500" />
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "audience",
      header: t("subscriptionPlans.audience"),
      cell: ({ row }) => {
        const audience = row.original.audience;
        const variant = audience === "both" ? "default" : "secondary";
        
        return (
          <Badge variant={variant} data-testid={`audience-${row.original.id}`}>
            {t(`subscriptionPlans.${audience}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "price",
      header: t("subscriptionPlans.price"),
      cell: ({ row }) => {
        const plan = row.original;
        const price = parseFloat(plan.price).toLocaleString();
        
        return (
          <div className="text-sm" data-testid={`price-${row.original.id}`}>
            {price} SAR/month
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("common.status"),
      cell: ({ row }) => {
        const status = row.original.status;
        const variant = 
          status === "active" ? "default" : 
          status === "archived" ? "outline" : 
          "secondary";
        
        return (
          <Badge variant={variant} data-testid={`status-${row.original.id}`}>
            {status === "active" && t("common.active")}
            {status === "inactive" && t("common.inactive")}
            {status === "archived" && t("subscriptionPlans.archived")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const plan = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-actions-${plan.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleEdit(plan)}
                data-testid={`button-edit-${plan.id}`}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t("subscriptionPlans.editPlan")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(plan)}
                className="text-destructive"
                data-testid={`button-delete-${plan.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("subscriptionPlans.deletePlan")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize });
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SubscriptionPlan>) => {
      const response = await apiRequest("PATCH", `/api/admin/subscription-plans/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      setEditDialogOpen(false);
      setSelectedPlan(null);
      toast({
        title: t("common.success"),
        description: t("subscriptionPlans.planUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("subscriptionPlans.updateError"),
        variant: "destructive",
      });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<SubscriptionPlan>) => {
      const response = await apiRequest("POST", "/api/admin/subscription-plans", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      setEditDialogOpen(false);
      setSelectedPlan(null);
      toast({
        title: t("common.success"),
        description: t("subscriptionPlans.planCreated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("subscriptionPlans.createError"),
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/subscription-plans/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      setDeleteDialogOpen(false);
      setSelectedPlan(null);
      toast({
        title: t("common.success"),
        description: t("subscriptionPlans.planDeleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("subscriptionPlans.deleteError"),
        variant: "destructive",
      });
    },
  });

  const handleEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedPlan(null);
    setEditDialogOpen(true);
  };

  const handleDelete = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPlan) {
      deleteMutation.mutate(selectedPlan.id);
    }
  };

  const handleSubmit = (data: Partial<SubscriptionPlan>) => {
    if (selectedPlan?.id) {
      updateMutation.mutate({ ...data, id: selectedPlan.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4 p-4">
        <AdminPageHeader
          title={t("subscriptionPlans.title")}
          subtitle={t("subscriptionPlans.subtitle")}
          testId="subscription-plans"
          actions={
            <Button onClick={handleAdd} data-testid="button-add-plan">
              <Plus className="mr-2 h-4 w-4" />
              {t("subscriptionPlans.addPlan")}
            </Button>
          }
        />

        {/* Filters */}
        <FilterBar
          searchPlaceholder={t("common.search")}
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          filters={filterConfig}
          onFiltersChange={setFilters}
          onReset={() => {
            setSearchValue("");
            setFilters({});
            setPagination({ pageIndex: 0, pageSize: 10 });
          }}
          showAdvancedFilters={true}
        />

        {/* Table */}
        <DataTable
          columns={columns}
          data={plans}
          isLoading={isLoading}
          pageCount={pageCount}
          manualPagination={true}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
        />

        {/* Edit/Create Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPlan ? t("subscriptionPlans.editPlan") : t("subscriptionPlans.addPlan")}
              </DialogTitle>
              <DialogDescription>
                {selectedPlan 
                  ? t("subscriptionPlans.editPlanDescription") 
                  : t("subscriptionPlans.addPlanDescription")}
              </DialogDescription>
            </DialogHeader>
            <PlanForm
              plan={selectedPlan}
              onSubmit={handleSubmit}
              onCancel={() => setEditDialogOpen(false)}
              isPending={updateMutation.isPending || createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("subscriptionPlans.deletePlanConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("subscriptionPlans.deletePlanWarning", { name: selectedPlan?.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
