import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { MoreHorizontal, Eye, Check, X, UserX, Plus, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Vendor {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  profileId: string | null;
  fullName: string | null;
  title: string | null;
  bio: string | null;
  hourlyRate: string | null;
  experience: string | null;
  verified: boolean | null;
  rating: string | null;
  totalReviews: number | null;
  completedProjects: number | null;
  availability: string | null;
  location: string | null;
}

export default function AdminVendors() {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Fetch vendors from API
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/vendors", filters, searchValue, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      if (filters.verified) params.append('verified', filters.verified);
      if (filters.experience) params.append('experience', filters.experience);
      if (filters.rating) params.append('rating', filters.rating);
      if (searchValue.trim()) params.append('search', searchValue.trim());
      params.append('page', (pagination.pageIndex + 1).toString());
      params.append('limit', pagination.pageSize.toString());
      
      const url = `/api/admin/vendors?${params.toString()}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  const vendors = data?.vendors || [];
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
      key: "verified",
      label: t("vendors.filterByVerified"),
      type: "select" as const,
      options: [
        { label: t("vendors.verified"), value: "true" },
        { label: "Not Verified", value: "false" },
      ],
    },
    {
      key: "experience",
      label: t("vendors.filterByExperience"),
      type: "select" as const,
      options: [
        { label: t("vendors.junior"), value: "junior" },
        { label: t("vendors.mid"), value: "mid" },
        { label: t("vendors.senior"), value: "senior" },
        { label: t("vendors.expert"), value: "expert" },
      ],
    },
    {
      key: "rating",
      label: t("vendors.filterByRating"),
      type: "select" as const,
      options: [
        { label: "5", value: "5" },
        { label: "4+", value: "4" },
        { label: "3+", value: "3" },
        { label: "2+", value: "2" },
        { label: "1+", value: "1" },
      ],
    },
  ];

  // Experience badge variants
  const getExperienceBadgeVariant = (experience: string | null) => {
    switch (experience) {
      case "expert":
        return "default";
      case "senior":
        return "secondary";
      case "mid":
        return "outline";
      case "junior":
        return "outline";
      default:
        return "outline";
    }
  };

  // Render star rating
  const renderRating = (rating: string | null, totalReviews: number | null) => {
    if (!rating) {
      return <span className="text-muted-foreground">-</span>;
    }
    const ratingNum = parseFloat(rating);
    return (
      <div className="flex items-center gap-1">
        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-medium">{ratingNum.toFixed(1)}/5</span>
        {totalReviews !== null && (
          <span className="text-xs text-muted-foreground">({totalReviews})</span>
        )}
      </div>
    );
  };

  // Table columns
  const columns: ColumnDef<Vendor>[] = [
    {
      accessorKey: "fullName",
      header: t("vendors.fullName"),
      cell: ({ row }) => {
        const vendor = row.original;
        const displayName = vendor.fullName || vendor.email;
        
        return (
          <div className="font-medium" data-testid={`name-${vendor.id}`}>
            {displayName}
          </div>
        );
      },
    },
    {
      accessorKey: "title",
      header: t("vendors.title"),
      cell: ({ row }) => {
        const vendor = row.original;
        if (!vendor.title) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="text-sm" data-testid={`title-${vendor.id}`}>
            {vendor.title}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: t("users.email"),
      cell: ({ row }) => {
        const vendor = row.original;
        return (
          <div className="text-sm text-muted-foreground" data-testid={`email-${vendor.id}`}>
            {vendor.email}
          </div>
        );
      },
    },
    {
      accessorKey: "experience",
      header: t("vendors.experience"),
      cell: ({ row }) => {
        const vendor = row.original;
        if (!vendor.experience) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <Badge
            variant={getExperienceBadgeVariant(vendor.experience)}
            data-testid={`experience-${vendor.id}`}
          >
            {t(`vendors.${vendor.experience}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "rating",
      header: t("vendors.rating"),
      cell: ({ row }) => {
        const vendor = row.original;
        return (
          <div data-testid={`rating-${vendor.id}`}>
            {renderRating(vendor.rating, vendor.totalReviews)}
          </div>
        );
      },
    },
    {
      accessorKey: "completedProjects",
      header: t("vendors.completedProjects"),
      cell: ({ row }) => {
        const count = row.original.completedProjects;
        if (count === null) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="text-sm">
            {count}
          </div>
        );
      },
    },
    {
      accessorKey: "hourlyRate",
      header: t("vendors.hourlyRate"),
      cell: ({ row }) => {
        const rate = row.original.hourlyRate;
        if (!rate) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="text-sm">
            {parseFloat(rate).toLocaleString()} SAR
          </div>
        );
      },
    },
    {
      accessorKey: "verified",
      header: t("vendors.verified"),
      cell: ({ row }) => {
        const vendor = row.original;
        const isVerified = vendor.verified === true;
        return (
          <div className="flex items-center gap-2" data-testid={`verified-${vendor.id}`}>
            {isVerified ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const vendor = row.original;
        const isVerified = vendor.verified === true;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-actions-${vendor.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                data-testid={`button-view-${vendor.id}`}
                onClick={() => window.location.href = `/consultant/${vendor.id}`}
              >
                <Eye className="mr-2 h-4 w-4" />
                {t("vendors.viewProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem data-testid={`button-verify-${vendor.id}`}>
                <Check className="mr-2 h-4 w-4" />
                {isVerified ? t("vendors.unverify") : t("vendors.verify")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                data-testid={`button-suspend-${vendor.id}`}
              >
                <UserX className="mr-2 h-4 w-4" />
                {t("vendors.suspend")}
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
    <div className="space-y-4 p-4">
        <AdminPageHeader
          title={t("vendors.title")}
          subtitle={t("vendors.subtitle")}
          testId="vendors"
          actions={
            <Button data-testid="button-add-vendor">
              <Plus className="mr-2 h-4 w-4" />
              {t("vendors.addVendor")}
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
          data={vendors}
          isLoading={isLoading}
          pageCount={pageCount}
          manualPagination={true}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
        />
    </div>
  );
}
