import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, FilterConfig } from "@/components/admin/FilterBar";
import { PAYMENT_STATUSES, PAYMENT_TYPES } from "@shared/schema";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

type PaymentRow = {
  id: string;
  projectId: string;
  projectTitle: string | null;
  fromUserId: string;
  payerEmail: string | null;
  payerName: string;
  toUserId: string;
  payeeEmail: string | null;
  payeeName: string;
  amount: string;
  currency: string | null;
  type: string;
  status: string;
  paymentMethod: string | null;
  transactionId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaymentsResponse = {
  payments: PaymentRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function AdminPayments() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const statusFilter = filters.status || "all";
  const typeFilter = filters.type || "all";

  const { data, isLoading } = useQuery<PaymentsResponse>({
    queryKey: ['/api/admin/payments', pagination.pageIndex + 1, pagination.pageSize, searchValue, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(searchValue && { search: searchValue }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
      });
      
      const res = await fetch(`/api/admin/payments?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch payments');
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

  const columns: ColumnDef<PaymentRow>[] = [
    {
      accessorKey: "transactionId",
      header: t("admin.payments.table.transactionId"),
      cell: ({ row }) => (
        <div className="font-mono text-xs" data-testid={`text-transaction-id-${row.original.id}`}>
          {row.original.transactionId || "-"}
        </div>
      ),
    },
    {
      accessorKey: "projectTitle",
      header: t("admin.payments.table.project"),
      cell: ({ row }) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate" data-testid={`text-project-title-${row.original.id}`}>
            {row.original.projectTitle || "-"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "payerName",
      header: t("admin.payments.table.payer"),
      cell: ({ row }) => (
        <div className="max-w-[160px]">
          <div className="font-medium truncate" data-testid={`text-payer-name-${row.original.id}`}>
            {row.original.payerName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.payerEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "payeeName",
      header: t("admin.payments.table.payee"),
      cell: ({ row }) => (
        <div className="max-w-[160px]">
          <div className="font-medium truncate" data-testid={`text-payee-name-${row.original.id}`}>
            {row.original.payeeName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.payeeEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: t("admin.payments.table.amount"),
      cell: ({ row }) => (
        <div className="text-right font-medium" data-testid={`text-amount-${row.original.id}`}>
          {parseFloat(row.original.amount).toLocaleString('ar-SA', { 
            style: 'currency', 
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("admin.payments.table.type"),
      cell: ({ row }) => (
        <div data-testid={`text-type-${row.original.id}`}>
          {t(`admin.payments.type.${row.original.type}`)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("admin.payments.table.status"),
      cell: ({ row }) => (
        <div data-testid={`text-status-${row.original.id}`}>
          {t(`admin.payments.status.${row.original.status}`)}
        </div>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: t("admin.payments.table.paymentMethod"),
      cell: ({ row }) => (
        <div data-testid={`text-payment-method-${row.original.id}`}>
          {row.original.paymentMethod || "-"}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("admin.payments.table.createdAt"),
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground" data-testid={`text-created-${row.original.id}`}>
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </div>
      ),
    },
  ];

  const statusFilterOptions = [
    { value: "all", label: t("common.all") },
    ...PAYMENT_STATUSES.map((status) => ({
      value: status,
      label: t(`admin.payments.status.${status}`),
    })),
  ];

  const typeFilterOptions = [
    { value: "all", label: t("common.all") },
    ...PAYMENT_TYPES.map((type) => ({
      value: type,
      label: t(`admin.payments.type.${type}`),
    })),
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: "status",
      label: t("admin.payments.filters.status"),
      type: "select",
      options: statusFilterOptions,
    },
    {
      key: "type",
      label: t("admin.payments.filters.type"),
      type: "select",
      options: typeFilterOptions,
    },
  ];

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("admin.payments.title")}
        subtitle={t("admin.payments.description")}
        testId="payments"
      />

      <FilterBar
        searchPlaceholder={t("admin.payments.searchPlaceholder")}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        filters={filterConfigs}
        onFiltersChange={handleFiltersChange}
      />

      <DataTable
        columns={columns}
        data={data?.payments || []}
        pageCount={data?.totalPages || 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        manualPagination={true}
      />
    </div>
  );
}
