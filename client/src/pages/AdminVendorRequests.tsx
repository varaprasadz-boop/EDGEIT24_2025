import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar } from "@/components/admin/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VendorRequest {
  id: string;
  vendorId: string;
  vendorEmail: string;
  vendorName: string | null;
  categoryId: string;
  categoryName: string;
  categoryNameAr: string;
  status: string;
  yearsOfExperience: number | null;
  reasonForRequest: string | null;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VendorRequestsResponse {
  requests: VendorRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminVendorRequests() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const statusFilter = filters.status || "all";

  const { data, isLoading } = useQuery<VendorRequestsResponse>({
    queryKey: ['/api/admin/vendor-requests', pagination.pageIndex + 1, pagination.pageSize, searchValue, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(searchValue && { search: searchValue }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const res = await fetch(`/api/admin/vendor-requests?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch vendor requests');
      }
      
      return res.json();
    },
  });

  const statusFilterOptions = [
    { value: "all", label: t("vendorRequests.filters.allStatuses") },
    { value: "pending", label: t("vendorRequests.filters.pending") },
    { value: "approved", label: t("vendorRequests.filters.approved") },
    { value: "rejected", label: t("vendorRequests.filters.rejected") },
  ];

  const columns: ColumnDef<VendorRequest>[] = [
    {
      accessorKey: "vendorEmail",
      header: t("vendorRequests.table.vendor"),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium" data-testid={`text-vendor-email-${row.original.id}`}>
            {row.original.vendorEmail}
          </span>
          {row.original.vendorName && (
            <span className="text-sm text-muted-foreground" data-testid={`text-vendor-name-${row.original.id}`}>
              {row.original.vendorName}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "categoryName",
      header: t("vendorRequests.table.category"),
      cell: ({ row }) => (
        <span data-testid={`text-category-${row.original.id}`}>
          {isRTL && row.original.categoryNameAr ? row.original.categoryNameAr : row.original.categoryName}
        </span>
      ),
    },
    {
      accessorKey: "yearsOfExperience",
      header: t("vendorRequests.table.experience"),
      cell: ({ row }) => (
        <span data-testid={`text-experience-${row.original.id}`}>
          {row.original.yearsOfExperience ? `${row.original.yearsOfExperience} ${t('vendorRequests.table.years')}` : '-'}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("vendorRequests.table.status"),
      cell: ({ row }) => {
        const status = row.original.status;
        const variant = status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary';
        
        return (
          <Badge variant={variant} data-testid={`badge-status-${row.original.id}`}>
            {t(`vendorRequests.status.${status}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: t("vendorRequests.table.requestedAt"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground" data-testid={`text-created-${row.original.id}`}>
          {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: "actions",
      header: t("vendorRequests.table.actions"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            data-testid={`button-view-${row.original.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === 'pending' && (
            <>
              <Button
                size="icon"
                variant="ghost"
                data-testid={`button-approve-${row.original.id}`}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                data-testid={`button-reject-${row.original.id}`}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const handleFiltersChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="heading-vendor-requests">
          {t("vendorRequests.title")}
        </h1>
        <p className="text-muted-foreground" data-testid="text-vendor-requests-description">
          {t("vendorRequests.description")}
        </p>
      </div>

      <FilterBar
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        filters={[
          {
            key: 'status',
            label: t("vendorRequests.filters.status"),
            type: 'select',
            options: statusFilterOptions,
          },
        ]}
        onFiltersChange={handleFiltersChange}
      />

      <DataTable
        columns={columns}
        data={data?.requests || []}
        isLoading={isLoading}
        manualPagination={true}
        pageCount={data?.totalPages || 0}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
