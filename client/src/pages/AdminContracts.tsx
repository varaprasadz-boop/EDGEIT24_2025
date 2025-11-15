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
import { formatDistanceToNow } from "date-fns";
import { PROJECT_STATUSES, type ProjectStatus } from "@shared/schema";

interface AdminContract {
  id: string;
  jobId: string;
  jobTitle: string;
  bidId: string;
  bidAmount: string | null;
  bidDuration: string | null;
  clientId: string;
  clientEmail: string;
  clientName: string;
  consultantId: string;
  consultantEmail: string;
  consultantName: string;
  title: string;
  description: string | null;
  budget: string;
  status: ProjectStatus;
  milestones: any[];
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  totalPaid: string;
  paymentCount: number;
  disputeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ContractsResponse {
  contracts: AdminContract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminContracts() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const statusFilter = filters.status || "all";

  const { data, isLoading } = useQuery<ContractsResponse>({
    queryKey: ['/api/admin/contracts', pagination.pageIndex + 1, pagination.pageSize, searchValue, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(searchValue && { search: searchValue }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const res = await fetch(`/api/admin/contracts?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch contracts');
      }
      
      return res.json();
    },
  });

  const statusOptions = [
    { value: "all", label: t("common.all") },
    ...PROJECT_STATUSES.map(status => ({
      value: status,
      label: t(`admin.contracts.status.${status}`)
    }))
  ];

  const filterConfig: FilterConfig[] = [
    {
      key: "status",
      label: t("admin.contracts.filters.status"),
      type: "select",
      options: statusOptions,
    },
  ];

  const columns: ColumnDef<AdminContract>[] = [
    {
      accessorKey: "title",
      header: t("admin.contracts.table.title"),
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium truncate" data-testid={`text-contract-title-${row.original.id}`}>
            {row.original.title}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.jobTitle}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "client",
      header: t("admin.contracts.table.client"),
      cell: ({ row }) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate" data-testid={`text-client-name-${row.original.id}`}>
            {row.original.clientName || "—"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.clientEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "consultant",
      header: t("admin.contracts.table.consultant"),
      cell: ({ row }) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate" data-testid={`text-consultant-name-${row.original.id}`}>
            {row.original.consultantName || "—"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.consultantEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "budget",
      header: t("admin.contracts.table.budget"),
      cell: ({ row }) => (
        <div data-testid={`text-budget-${row.original.id}`}>
          <div className="font-mono">
            {parseFloat(row.original.budget).toLocaleString('ar-SA', {
              style: 'currency',
              currency: 'SAR',
              minimumFractionDigits: 2
            })}
          </div>
          {row.original.bidAmount && (
            <div className="text-xs text-muted-foreground font-mono">
              {t("admin.contracts.table.bidAmount")}: {parseFloat(row.original.bidAmount).toLocaleString('ar-SA', {
                style: 'currency',
                currency: 'SAR',
                minimumFractionDigits: 2
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("admin.contracts.table.status"),
      cell: ({ row }) => {
        const statusColors: Record<string, string> = {
          not_started: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
          in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
          paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
          completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
          cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
          disputed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
        };
        
        return (
          <Badge
            variant="secondary"
            className={statusColors[row.original.status] || ""}
            data-testid={`badge-status-${row.original.id}`}
          >
            {t(`admin.contracts.status.${row.original.status}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "milestones",
      header: t("admin.contracts.table.milestones"),
      cell: ({ row }) => {
        const milestones = row.original.milestones || [];
        const completedCount = milestones.filter((m: any) => m.status === 'completed').length;
        
        return (
          <div className="text-sm" data-testid={`text-milestones-${row.original.id}`}>
            {milestones.length > 0 ? (
              <span>{completedCount}/{milestones.length} {t("admin.contracts.table.completed")}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "payments",
      header: t("admin.contracts.table.payments"),
      cell: ({ row }) => (
        <div data-testid={`text-payments-${row.original.id}`}>
          <div className="font-mono text-sm">
            {parseFloat(row.original.totalPaid).toLocaleString('ar-SA', {
              style: 'currency',
              currency: 'SAR',
              minimumFractionDigits: 2
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.paymentCount} {t("admin.contracts.table.transactions")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "disputes",
      header: t("admin.contracts.table.disputes"),
      cell: ({ row }) => (
        <div data-testid={`text-disputes-${row.original.id}`}>
          {row.original.disputeCount > 0 ? (
            <Badge variant="destructive">
              {row.original.disputeCount}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("admin.contracts.table.createdAt"),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-created-${row.original.id}`}>
          {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
        </div>
      ),
    },
  ];

  const contracts = data?.contracts || [];
  const pageCount = data?.totalPages || 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-contracts">
          {t("admin.contracts.title")}
        </h1>
        <p className="text-muted-foreground" data-testid="text-contracts-description">
          {t("admin.contracts.description")}
        </p>
      </div>

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={t("admin.contracts.searchPlaceholder")}
        filters={filterConfig}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          setPagination({ ...pagination, pageIndex: 0 });
        }}
        onReset={() => {
          setSearchValue("");
          setFilters({});
          setPagination({ pageIndex: 0, pageSize: 20 });
        }}
      />

      <DataTable
        columns={columns}
        data={contracts}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        manualPagination
      />
    </div>
  );
}
