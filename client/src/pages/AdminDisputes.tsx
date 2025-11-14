import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { MoreHorizontal, Plus } from "lucide-react";

type DisputeRow = {
  id: string;
  projectId: string;
  projectTitle: string;
  raisedBy: string;
  raisedByEmail: string;
  raisedByName: string;
  against: string;
  againstEmail: string;
  againstName: string;
  reason: string;
  description: string;
  status: string;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedByEmail: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

type DisputesResponse = {
  disputes: DisputeRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const DISPUTE_STATUSES = ["open", "under_review", "resolved", "closed"];

export default function AdminDisputes() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const statusFilter = filters.status || "all";

  const { data, isLoading } = useQuery<DisputesResponse>({
    queryKey: ['/api/admin/disputes', pagination.pageIndex + 1, pagination.pageSize, searchValue, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(searchValue && { search: searchValue }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
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

  const handleFiltersChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const getStatusVariant = (status: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (status) {
      case "open":
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

  const columns: ColumnDef<DisputeRow>[] = [
    {
      accessorKey: "id",
      header: t("disputes.id"),
      cell: ({ row }) => (
        <div className="font-mono text-sm" data-testid={`id-${row.original.id}`}>
          {row.original.id.substring(0, 8)}
        </div>
      ),
    },
    {
      accessorKey: "projectTitle",
      header: t("disputes.projectTitle"),
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium truncate" data-testid={`project-${row.original.id}`}>
            {row.original.projectTitle}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "raisedByName",
      header: t("disputes.raisedBy"),
      cell: ({ row }) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate" data-testid={`raised-by-${row.original.id}`}>
            {row.original.raisedByName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.raisedByEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "againstName",
      header: t("disputes.against"),
      cell: ({ row }) => (
        <div className="max-w-[180px]">
          <div className="font-medium truncate" data-testid={`against-${row.original.id}`}>
            {row.original.againstName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {row.original.againstEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: t("disputes.reason"),
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="truncate" data-testid={`reason-${row.original.id}`}>
            {row.original.reason}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("common.status"),
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)} data-testid={`status-${row.original.id}`}>
          {t(`disputes.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("common.createdAt"),
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground" data-testid={`created-${row.original.id}`}>
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </div>
      ),
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${row.original.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                console.log("View details for dispute:", row.original.id);
              }}
              data-testid={`button-view-${row.original.id}`}
            >
              {t("disputes.viewDetails")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                console.log("Resolve dispute:", row.original.id);
              }}
              data-testid={`button-resolve-${row.original.id}`}
            >
              {t("disputes.resolve")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const statusFilterOptions = [
    { value: "all", label: t("common.all") },
    ...DISPUTE_STATUSES.map((status) => ({
      value: status,
      label: t(`disputes.${status}`),
    })),
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: "status",
      label: t("disputes.filterByStatus"),
      type: "select",
      options: statusFilterOptions,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-disputes">
            {t("disputes.title")}
          </h1>
          <p className="text-muted-foreground" data-testid="text-disputes-description">
            {t("disputes.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => {
            console.log("Create dispute clicked");
          }}
          data-testid="button-create-dispute"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("disputes.createDispute")}
        </Button>
      </div>

      <FilterBar
        searchPlaceholder={t("disputes.searchPlaceholder")}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        filters={filterConfigs}
        onFiltersChange={handleFiltersChange}
      />

      <DataTable
        columns={columns}
        data={data?.disputes || []}
        pageCount={data?.totalPages || 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        manualPagination={true}
      />
    </div>
  );
}
