import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar";
import { BID_STATUSES } from "@shared/schema";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

type BidRow = {
  id: string;
  jobId: string;
  jobTitle: string;
  clientId: string;
  clientEmail: string | null;
  clientName: string;
  consultantId: string;
  consultantEmail: string | null;
  consultantName: string;
  proposedBudget: string;
  proposedDuration: string | null;
  status: string;
  clientViewed: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

type BidsResponse = {
  bids: BidRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function AdminBids() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const statusFilter = filters.status || "all";

  const { data, isLoading } = useQuery<BidsResponse>({
    queryKey: ['/api/admin/bids', pagination.pageIndex + 1, pagination.pageSize, searchValue, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(searchValue && { search: searchValue }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const res = await fetch(`/api/admin/bids?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch bids');
      }
      
      return res.json();
    },
  });

  const handleFiltersChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const columns: ColumnDef<BidRow>[] = [
    {
      accessorKey: "jobTitle",
      header: t("admin.bids.table.job"),
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium truncate" data-testid={`text-job-title-${row.original.id}`}>
            {row.original.jobTitle}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "consultantName",
      header: t("admin.bids.table.consultant"),
      cell: ({ row }) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate" data-testid={`text-consultant-name-${row.original.id}`}>
            {row.original.consultantName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.consultantEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "clientName",
      header: t("admin.bids.table.client"),
      cell: ({ row }) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate" data-testid={`text-client-name-${row.original.id}`}>
            {row.original.clientName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.clientEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "proposedBudget",
      header: t("admin.bids.table.budget"),
      cell: ({ row }) => (
        <div className="text-right font-medium" data-testid={`text-budget-${row.original.id}`}>
          {parseFloat(row.original.proposedBudget).toLocaleString('ar-SA', { 
            style: 'currency', 
            currency: 'SAR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </div>
      ),
    },
    {
      accessorKey: "proposedDuration",
      header: t("admin.bids.table.duration"),
      cell: ({ row }) => (
        <div data-testid={`text-duration-${row.original.id}`}>
          {row.original.proposedDuration || "-"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("admin.bids.table.status"),
      cell: ({ row }) => (
        <div data-testid={`text-status-${row.original.id}`}>
          {t(`admin.bids.status.${row.original.status}`)}
        </div>
      ),
    },
    {
      accessorKey: "clientViewed",
      header: t("admin.bids.table.viewed"),
      cell: ({ row }) => (
        <div data-testid={`text-viewed-${row.original.id}`}>
          {row.original.clientViewed ? t("common.yes") : t("common.no")}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("admin.bids.table.createdAt"),
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground" data-testid={`text-created-${row.original.id}`}>
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </div>
      ),
    },
  ];

  const statusFilterOptions = [
    { value: "all", label: t("common.all") },
    ...BID_STATUSES.map((status) => ({
      value: status,
      label: t(`admin.bids.status.${status}`),
    })),
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: "status",
      label: t("admin.bids.filters.status"),
      type: "select",
      options: statusFilterOptions,
    },
  ];

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("admin.bids.title")}
        subtitle={t("admin.bids.description")}
        testId="bids"
      />

      <FilterBar
        searchPlaceholder={t("admin.bids.searchPlaceholder")}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        filters={filterConfigs}
        onFiltersChange={handleFiltersChange}
      />

      <DataTable
        columns={columns}
        data={data?.bids || []}
        pageCount={data?.totalPages || 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        manualPagination={true}
      />
    </div>
  );
}
