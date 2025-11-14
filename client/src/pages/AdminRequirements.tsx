import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ColumnDef,
  PaginationState,
} from "@tanstack/react-table";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { JOB_STATUSES, type JobStatus } from "@shared/schema";

interface AdminRequirementJob {
  id: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryNameAr: string | null;
  title: string;
  description: string;
  budget: string | null;
  budgetType: string | null;
  duration: string | null;
  experienceLevel: string | null;
  status: JobStatus;
  bidCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RequirementsResponse {
  jobs: AdminRequirementJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminRequirements() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const statusFilter = filters.status || "all";
  const categoryFilter = filters.category || "all";

  // Fetch categories for the filter dropdown
  const { data: categoriesData } = useQuery<{ categories: Array<{ id: string; name: string; nameAr: string }> }>({
    queryKey: ['/api/admin/categories', 1, 1000],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
      });
      
      const res = await fetch(`/api/admin/categories?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      return res.json();
    },
  });

  const { data, isLoading } = useQuery<RequirementsResponse>({
    queryKey: ['/api/admin/requirements', pagination.pageIndex + 1, pagination.pageSize, searchValue, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(searchValue && { search: searchValue }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
      });
      
      const res = await fetch(`/api/admin/requirements?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch requirements');
      }
      
      return res.json();
    },
  });

  const statusFilterOptions = [
    { value: "all", label: t("requirements.filters.allStatuses") },
    ...JOB_STATUSES.map(status => ({
      value: status,
      label: t(`requirements.statuses.${status}`),
    })),
  ];

  const categoryFilterOptions = [
    { value: "all", label: t("requirements.filters.allCategories") },
    ...(categoriesData?.categories || []).map(cat => ({
      value: cat.id,
      label: isRTL ? cat.nameAr : cat.name,
    })),
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: "status",
      label: t("requirements.filters.status"),
      type: "select",
      options: statusFilterOptions,
    },
    {
      key: "category",
      label: t("requirements.filters.category"),
      type: "select",
      options: categoryFilterOptions,
    },
  ];

  const columns: ColumnDef<AdminRequirementJob>[] = [
    {
      accessorKey: "title",
      header: t("requirements.columns.title"),
      cell: ({ row }) => (
        <div className="max-w-md">
          <div className="font-medium truncate" data-testid={`text-job-title-${row.original.id}`}>
            {row.original.title}
          </div>
          {row.original.description && (
            <div className="text-sm text-muted-foreground truncate">
              {row.original.description.substring(0, 80)}...
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "clientName",
      header: t("requirements.columns.client"),
      cell: ({ row }) => (
        <div>
          <div className="font-medium" data-testid={`text-client-name-${row.original.id}`}>
            {row.original.clientName || row.original.clientEmail}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.clientEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "categoryName",
      header: t("requirements.columns.category"),
      cell: ({ row }) => {
        const categoryName = isRTL ? row.original.categoryNameAr : row.original.categoryName;
        return categoryName ? (
          <span data-testid={`text-category-${row.original.id}`}>
            {categoryName}
          </span>
        ) : (
          <span className="text-muted-foreground">{t("requirements.noCategory")}</span>
        );
      },
    },
    {
      accessorKey: "budget",
      header: t("requirements.columns.budget"),
      cell: ({ row }) => {
        if (!row.original.budget) {
          return <span className="text-muted-foreground">{t("requirements.negotiable")}</span>;
        }
        const budgetTypeLabel = row.original.budgetType 
          ? t(`requirements.budgetTypes.${row.original.budgetType}`)
          : "";
        return (
          <div data-testid={`text-budget-${row.original.id}`}>
            <div className="font-medium">
              {parseFloat(row.original.budget).toLocaleString()} {t("requirements.currency")}
            </div>
            {budgetTypeLabel && (
              <div className="text-sm text-muted-foreground">
                {budgetTypeLabel}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("requirements.columns.status"),
      cell: ({ row }) => {
        const statusMap: Record<JobStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          draft: { label: t("requirements.statuses.draft"), variant: "outline" },
          open: { label: t("requirements.statuses.open"), variant: "default" },
          inProgress: { label: t("requirements.statuses.inProgress"), variant: "secondary" },
          completed: { label: t("requirements.statuses.completed"), variant: "default" },
          cancelled: { label: t("requirements.statuses.cancelled"), variant: "destructive" },
        };
        const status = statusMap[row.original.status] || statusMap.draft;
        return (
          <Badge variant={status.variant} data-testid={`badge-status-${row.original.id}`}>
            {status.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "bidCount",
      header: t("requirements.columns.bids"),
      cell: ({ row }) => (
        <div className="text-center" data-testid={`text-bid-count-${row.original.id}`}>
          {row.original.bidCount}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("requirements.columns.posted"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground" data-testid={`text-created-${row.original.id}`}>
          {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: "actions",
      header: t("requirements.columns.actions"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            data-testid={`button-view-${row.original.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            data-testid={`button-bids-${row.original.id}`}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleFiltersChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("requirements.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("requirements.subtitle")}
        </p>
      </div>

      <FilterBar
        searchPlaceholder={t("requirements.searchPlaceholder")}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        filters={filterConfigs}
        onFiltersChange={handleFiltersChange}
      />

      <DataTable
        columns={columns}
        data={data?.jobs || []}
        pageCount={data?.totalPages || 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
      />
    </div>
  );
}
