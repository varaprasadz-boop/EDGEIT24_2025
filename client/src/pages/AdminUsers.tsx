import { useState } from "react";
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
import { MoreHorizontal, Eye, Ban, CheckCircle, Mail } from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Fetch users from API
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users", filters, searchValue],
  });

  // Filter columns configuration
  const filterConfig = [
    {
      key: "role",
      label: t("users.filterByRole"),
      type: "select" as const,
      options: [
        { label: t("users.client"), value: "client" },
        { label: t("users.consultant"), value: "consultant" },
        { label: t("users.both"), value: "both" },
        { label: "Admin", value: "admin" },
      ],
    },
    {
      key: "status",
      label: t("users.filterByStatus"),
      type: "select" as const,
      options: [
        { label: t("common.active"), value: "active" },
        { label: t("common.inactive"), value: "inactive" },
        { label: "Suspended", value: "suspended" },
      ],
    },
    {
      key: "verified",
      label: t("users.filterByVerified"),
      type: "select" as const,
      options: [
        { label: "Verified", value: "true" },
        { label: "Not Verified", value: "false" },
      ],
    },
  ];

  // Table columns
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "email",
      header: t("users.email"),
      cell: ({ row }) => {
        const user = row.original;
        const fullName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : null;
        
        return (
          <div className="space-y-1">
            <div className="font-medium" data-testid={`email-${user.id}`}>
              {user.email}
            </div>
            {fullName && (
              <div className="text-sm text-muted-foreground" data-testid={`name-${user.id}`}>
                {fullName}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: t("users.role"),
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        const roleVariant: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
          admin: "destructive",
          client: "secondary",
          consultant: "default",
          both: "outline",
        };
        return (
          <Badge 
            variant={roleVariant[role] || "outline"}
            data-testid={`role-${row.original.id}`}
          >
            {t(`users.${role}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("users.status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          active: "default",
          inactive: "secondary",
          suspended: "destructive",
        };
        return (
          <Badge 
            variant={statusVariant[status] || "outline"}
            data-testid={`status-${row.original.id}`}
          >
            {status === "suspended" ? t("users.suspended") : t(`common.${status}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "emailVerified",
      header: t("users.verified"),
      cell: ({ row }) => {
        const verified = row.getValue("emailVerified") as boolean;
        return (
          <div data-testid={`verified-${row.original.id}`}>
            {verified ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: t("users.registered"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <div 
            className="text-sm text-muted-foreground"
            data-testid={`created-${row.original.id}`}
          >
            {format(date, "MMM dd, yyyy")}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const user = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                data-testid={`button-actions-${user.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid={`action-view-${user.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                {t("users.viewProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem data-testid={`action-message-${user.id}`}>
                <Mail className="mr-2 h-4 w-4" />
                {t("users.sendMessage")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.status === "active" ? (
                <DropdownMenuItem 
                  className="text-destructive"
                  data-testid={`action-suspend-${user.id}`}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {t("users.suspend")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem data-testid={`action-activate-${user.id}`}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("users.activate")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter data based on search and filters
  const filteredUsers = users.filter((user) => {
    // Search filter
    const searchMatch = searchValue
      ? user.email.toLowerCase().includes(searchValue.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchValue.toLowerCase())
      : true;

    // Role filter
    const roleMatch = filters.role ? user.role === filters.role : true;

    // Status filter
    const statusMatch = filters.status ? user.status === filters.status : true;

    // Verified filter
    const verifiedMatch = filters.verified
      ? user.emailVerified === (filters.verified === "true")
      : true;

    return searchMatch && roleMatch && statusMatch && verifiedMatch;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 
            className="text-3xl font-bold tracking-tight"
            data-testid="title-users"
          >
            {t("users.title")}
          </h1>
          <p 
            className="text-muted-foreground mt-2"
            data-testid="subtitle-users"
          >
            {t("users.subtitle")}
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          searchPlaceholder={t("common.search")}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={filterConfig}
          onFiltersChange={setFilters}
          onReset={() => {
            setSearchValue("");
            setFilters({});
          }}
          showAdvancedFilters={true}
        />

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  );
}
