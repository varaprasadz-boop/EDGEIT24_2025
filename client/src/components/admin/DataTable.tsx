import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  pageCount?: number;
  manualPagination?: boolean;
  pagination?: { pageIndex: number; pageSize: number };
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pageCount,
  manualPagination = false,
  pagination: controlledPagination,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const pagination = manualPagination && controlledPagination ? controlledPagination : internalPagination;

  const table = useReactTable({
    data,
    columns,
    pageCount: manualPagination ? pageCount : undefined,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      
      if (manualPagination && onPaginationChange) {
        onPaginationChange(newPagination);
      } else {
        setInternalPagination(newPagination);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="p-24 text-center">
            <div className="flex justify-center items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>{t('table.loading')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For manual pagination, show empty state with pagination controls
  // For client-side pagination, show empty state without controls
  if (!data || data.length === 0) {
    if (!manualPagination) {
      return (
        <div className="space-y-4">
          <div className="rounded-md border">
            <div className="p-24 text-center text-muted-foreground">
              {t('table.noData')}
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      data-testid={`header-${header.id}`}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-2 ${
                            canSort ? 'cursor-pointer select-none hover-elevate active-elevate-2 rounded px-2 py-1 -mx-2 -my-1' : ''
                          }`}
                          onClick={
                            canSort
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {canSort && (
                            <span className="text-muted-foreground">
                              {isSorted === "asc" ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : isSorted === "desc" ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('table.noData')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-testid={`row-${row.id}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      data-testid={`cell-${cell.column.id}-${row.id}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {t('table.rowsPerPage')}
          </span>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => {
              if (manualPagination && onPaginationChange) {
                onPaginationChange({ pageIndex: 0, pageSize: Number(value) });
              } else {
                table.setPageSize(Number(value));
              }
            }}
          >
            <SelectTrigger
              className="h-8 w-[70px]"
              data-testid="select-page-size"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {manualPagination && (pageCount === undefined || pageCount === 0) ? (
              t('table.noData')
            ) : (
              t('table.pageInfo', {
                current: pagination.pageIndex + 1,
                total: manualPagination ? (pageCount || 0) : table.getPageCount(),
              })
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (manualPagination && onPaginationChange) {
                  onPaginationChange({ ...pagination, pageIndex: 0 });
                } else {
                  table.setPageIndex(0);
                }
              }}
              disabled={manualPagination ? pagination.pageIndex === 0 : !table.getCanPreviousPage()}
              data-testid="button-first-page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (manualPagination && onPaginationChange) {
                  onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 });
                } else {
                  table.previousPage();
                }
              }}
              disabled={manualPagination ? pagination.pageIndex === 0 : !table.getCanPreviousPage()}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (manualPagination && onPaginationChange) {
                  onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 });
                } else {
                  table.nextPage();
                }
              }}
              disabled={
                manualPagination
                  ? pagination.pageIndex >= (pageCount || 0) - 1 || (pageCount || 0) === 0
                  : !table.getCanNextPage()
              }
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (manualPagination && onPaginationChange) {
                  onPaginationChange({ ...pagination, pageIndex: Math.max(0, (pageCount || 0) - 1) });
                } else {
                  table.setPageIndex(Math.max(0, table.getPageCount() - 1));
                }
              }}
              disabled={
                manualPagination
                  ? pagination.pageIndex >= (pageCount || 0) - 1 || (pageCount || 0) === 0
                  : !table.getCanNextPage()
              }
              data-testid="button-last-page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
