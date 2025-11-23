import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Link as LinkIcon, Plus, Pencil, Trash2, Search } from "lucide-react";
import { FooterLinkFormDialog } from "@/components/admin/FooterLinkFormDialog";

interface FooterLink {
  id: string;
  label: string;
  labelAr: string | null;
  url: string;
  section: 'company' | 'legal' | 'support';
  displayOrder: number;
  isExternal: boolean;
  openInNewTab: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFooterLinks() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<FooterLink | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<FooterLink | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/footer-links'],
  });

  const links = (data as any)?.links || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/admin/footer-links/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/footer-links'] });
      toast({
        title: "Success",
        description: "Footer link deleted successfully",
      });
      setLinkToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete footer link",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await apiRequest(`/api/admin/footer-links/${id}`, 'PATCH', { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/footer-links'] });
      toast({
        title: "Success",
        description: "Link status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (link: FooterLink) => {
    setSelectedLink(link);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedLink(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedLink(null);
  };

  const handleDelete = (link: FooterLink) => {
    setLinkToDelete(link);
  };

  const confirmDelete = () => {
    if (linkToDelete) {
      deleteMutation.mutate(linkToDelete.id);
    }
  };

  const handleToggleActive = (link: FooterLink) => {
    toggleActiveMutation.mutate({ id: link.id, active: !link.active });
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch = link.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = sectionFilter === "all" || link.section === sectionFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && link.active) || 
      (statusFilter === "inactive" && !link.active);
    return matchesSearch && matchesSection && matchesStatus;
  });

  const getSectionBadge = (section: string) => {
    return (
      <Badge variant="outline" data-testid={`badge-section-${section}`}>
        {section}
      </Badge>
    );
  };

  return (
    <div className="space-y-4" data-testid="admin-footer-links-container">
      <AdminPageHeader
        title="Footer Links"
        subtitle="Manage footer navigation links organized by section"
        testId="footer-links"
        actions={
          <Button onClick={handleAdd} data-testid="button-add-link">
            <Plus className="mr-2 h-4 w-4" />
            Add Link
          </Button>
        }
      />

      <Card className="p-6" data-testid="card-filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by label or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger data-testid="select-section-filter">
              <SelectValue placeholder="Filter by section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card data-testid="card-links-table">
        {isLoading ? (
          <div className="p-8 text-center" data-testid="loading-state">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="p-8 text-center" data-testid="empty-state">
            <LinkIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No links found</h3>
            <p className="text-muted-foreground">
              {searchQuery || sectionFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first footer link"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link) => (
                <TableRow key={link.id} data-testid={`row-link-${link.id}`}>
                  <TableCell className="font-medium" data-testid={`text-label-${link.id}`}>
                    {link.label}
                    {link.isExternal && (
                      <Badge variant="secondary" className="ml-2">External</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-sm" data-testid={`text-url-${link.id}`}>
                      {link.url}
                    </code>
                  </TableCell>
                  <TableCell>{getSectionBadge(link.section)}</TableCell>
                  <TableCell data-testid={`text-order-${link.id}`}>
                    {link.displayOrder}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={link.active ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleActive(link)}
                      data-testid={`button-toggle-status-${link.id}`}
                    >
                      {link.active ? "Active" : "Inactive"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(link)}
                        data-testid={`button-edit-${link.id}`}
                        title="Edit link"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(link)}
                        data-testid={`button-delete-${link.id}`}
                        title="Delete link"
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

      <FooterLinkFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        link={selectedLink}
      />

      <AlertDialog open={!!linkToDelete} onOpenChange={() => setLinkToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Footer Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{linkToDelete?.label}"? This action cannot be undone.
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
