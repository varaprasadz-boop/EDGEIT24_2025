import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { AdminLayout } from "@/components/AdminLayout";
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
import { MoreHorizontal, Eye, Edit, Trash2, Plus, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  parentId: string | null;
  featured: boolean;
  displayOrder: number;
  active: boolean;
  minBudget: string | null;
  maxBudget: string | null;
  commissionRate: string | null;
}

export default function AdminCategories() {
  const { t, i18n } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Fetch categories from API
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/categories", filters, searchValue, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      if (filters.featured) params.append('featured', filters.featured);
      if (filters.active) params.append('active', filters.active);
      if (filters.parent) params.append('parent', filters.parent);
      if (searchValue.trim()) params.append('search', searchValue.trim());
      params.append('page', (pagination.pageIndex + 1).toString());
      params.append('limit', pagination.pageSize.toString());
      
      const url = `/api/admin/categories?${params.toString()}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  const categories = data?.categories || [];
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
      key: "featured",
      label: t("categories.filterByFeatured"),
      type: "select" as const,
      options: [
        { label: t("categories.featured"), value: "true" },
        { label: "Not Featured", value: "false" },
      ],
    },
    {
      key: "active",
      label: t("common.status"),
      type: "select" as const,
      options: [
        { label: t("common.active"), value: "true" },
        { label: t("common.inactive"), value: "false" },
      ],
    },
  ];

  // Table columns
  const columns: ColumnDef<Category>[] = [
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
      header: t("categories.nameEn"),
      cell: ({ row }) => {
        const category = row.original;
        const displayName = i18n.language === 'ar' && category.nameAr 
          ? category.nameAr 
          : category.name;
        
        return (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2" data-testid={`name-${category.id}`}>
              {displayName}
              {category.featured && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <div className="text-sm text-muted-foreground" data-testid={`slug-${category.id}`}>
              /{category.slug}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "budgetRange",
      header: t("categories.budgetRange"),
      cell: ({ row }) => {
        const category = row.original;
        if (!category.minBudget && !category.maxBudget) {
          return <span className="text-muted-foreground">-</span>;
        }
        const min = category.minBudget ? parseFloat(category.minBudget).toLocaleString() : '0';
        const max = category.maxBudget ? parseFloat(category.maxBudget).toLocaleString() : '∞';
        return (
          <div className="text-sm" data-testid={`budget-${row.original.id}`}>
            {min} - {max} SAR
          </div>
        );
      },
    },
    {
      accessorKey: "commissionRate",
      header: "Commission",
      cell: ({ row }) => {
        const rate = row.original.commissionRate;
        if (!rate) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="text-sm" data-testid={`commission-${row.original.id}`}>
            {parseFloat(rate)}%
          </div>
        );
      },
    },
    {
      accessorKey: "active",
      header: t("common.status"),
      cell: ({ row }) => {
        const active = row.original.active;
        return (
          <Badge
            variant={active ? "default" : "secondary"}
            data-testid={`status-${row.original.id}`}
          >
            {active ? t("common.active") : t("common.inactive")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const category = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-actions-${category.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid={`action-view-${category.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                {t("categories.viewDetails")}
              </DropdownMenuItem>
              <DropdownMenuItem data-testid={`action-edit-${category.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                {t("categories.editCategory")}
              </DropdownMenuItem>
              <DropdownMenuItem data-testid={`action-subcategory-${category.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                {t("categories.addSubcategory")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                data-testid={`action-delete-${category.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("categories.deleteCategory")}
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

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              data-testid="title-categories"
            >
              {t("categories.title")}
            </h1>
            <p
              className="text-muted-foreground mt-2"
              data-testid="subtitle-categories"
            >
              {t("categories.subtitle")}
            </p>
          </div>
          <Button data-testid="button-add-category">
            <Plus className="mr-2 h-4 w-4" />
            {t("categories.addCategory")}
          </Button>
        </div>

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
          data={categories}
          isLoading={isLoading}
          pageCount={pageCount}
          manualPagination={true}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
        />
      </div>
    </AdminLayout>
  );
}
