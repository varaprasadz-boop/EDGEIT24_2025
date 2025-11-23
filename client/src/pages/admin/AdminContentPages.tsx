import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { ContentPageFormDialog } from "@/components/admin/ContentPageFormDialog";

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  content: string;
  contentAr: string | null;
  pageType: 'legal' | 'company' | 'support';
  status: 'draft' | 'published' | 'archived';
  metaTitle: string | null;
  metaTitleAr: string | null;
  metaDescription: string | null;
  metaDescriptionAr: string | null;
  displayOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminContentPages() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<ContentPage | null>(null);
  const [pageToDelete, setPageToDelete] = useState<ContentPage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/content-pages'],
  });

  const pages = (data as any)?.pages || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/admin/content-pages/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-pages'] });
      toast({
        title: "Success",
        description: "Content page deleted successfully",
      });
      setPageToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete content page",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'published' | 'archived' }) => {
      await apiRequest(`/api/admin/content-pages/${id}`, 'PATCH', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-pages'] });
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (page: ContentPage) => {
    setSelectedPage(page);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedPage(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedPage(null);
  };

  const handleDelete = (page: ContentPage) => {
    setPageToDelete(page);
  };

  const confirmDelete = () => {
    if (pageToDelete) {
      deleteMutation.mutate(pageToDelete.id);
    }
  };

  const filteredPages = pages.filter((page) => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || page.pageType === typeFilter;
    const matchesStatus = statusFilter === "all" || page.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      published: "default",
      draft: "secondary",
      archived: "outline",
    };
    return (
      <Badge variant={variants[status]} data-testid={`badge-status-${status}`}>
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" data-testid={`badge-type-${type}`}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-4" data-testid="admin-content-pages-container">
      <AdminPageHeader
        title="Content Pages"
        subtitle="Manage website content pages including legal documents, company info, and support pages"
        testId="content-pages"
        actions={
          <Button onClick={handleAdd} data-testid="button-add-page">
            <Plus className="mr-2 h-4 w-4" />
            Add Page
          </Button>
        }
      />

      <Card className="p-6" data-testid="card-filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger data-testid="select-type-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card data-testid="card-pages-table">
        {isLoading ? (
          <div className="p-8 text-center" data-testid="loading-state">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-8 text-center" data-testid="empty-state">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No pages found</h3>
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first content page"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPages.map((page) => (
                <TableRow key={page.id} data-testid={`row-page-${page.id}`}>
                  <TableCell className="font-medium" data-testid={`text-title-${page.id}`}>
                    {page.title}
                  </TableCell>
                  <TableCell>
                    <code className="text-sm" data-testid={`text-slug-${page.id}`}>
                      {page.slug}
                    </code>
                  </TableCell>
                  <TableCell>{getTypeBadge(page.pageType)}</TableCell>
                  <TableCell>{getStatusBadge(page.status)}</TableCell>
                  <TableCell data-testid={`text-updated-${page.id}`}>
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`/legal/${page.slug}`, '_blank')}
                        data-testid={`button-view-${page.id}`}
                        title="View page"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(page)}
                        data-testid={`button-edit-${page.id}`}
                        title="Edit page"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(page)}
                        data-testid={`button-delete-${page.id}`}
                        title="Delete page"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ContentPageFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        page={selectedPage}
      />

      <AlertDialog open={!!pageToDelete} onOpenChange={() => setPageToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{pageToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
