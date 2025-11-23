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
import { LayoutGrid, Plus, Pencil, Trash2, Search } from "lucide-react";
import { HomeSectionFormDialog } from "@/components/admin/HomeSectionFormDialog";

interface HomeSection {
  id: string;
  sectionType: 'hero' | 'features' | 'testimonials' | 'stats' | 'cta';
  title: string | null;
  titleAr: string | null;
  subtitle: string | null;
  subtitleAr: string | null;
  content: string | null;
  contentAr: string | null;
  imageUrl: string | null;
  ctaText: string | null;
  ctaTextAr: string | null;
  ctaLink: string | null;
  displayOrder: number;
  active: boolean;
  settings: any;
  createdAt: string;
  updatedAt: string;
}

export default function AdminHomeSections() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<HomeSection | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<HomeSection | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/home-sections'],
  });

  const sections = (data as any)?.sections || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/admin/home-sections/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/home-sections'] });
      toast({
        title: "Success",
        description: "Section deleted successfully",
      });
      setSectionToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await apiRequest(`/api/admin/home-sections/${id}`, 'PATCH', { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/home-sections'] });
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

  const handleEdit = (section: HomeSection) => {
    setSelectedSection(section);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedSection(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedSection(null);
  };

  const handleDelete = (section: HomeSection) => {
    setSectionToDelete(section);
  };

  const confirmDelete = () => {
    if (sectionToDelete) {
      deleteMutation.mutate(sectionToDelete.id);
    }
  };

  const handleToggleActive = (section: HomeSection) => {
    toggleActiveMutation.mutate({ id: section.id, active: !section.active });
  };

  const filteredSections = sections.filter((section) => {
    const matchesSearch = (section.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || section.sectionType === typeFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && section.active) || 
      (statusFilter === "inactive" && !section.active);
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      hero: "default",
      features: "secondary",
      testimonials: "outline",
      stats: "secondary",
      cta: "default",
    };
    return (
      <Badge variant={variants[type] || "outline"} data-testid={`badge-type-${type}`}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-4" data-testid="admin-home-sections-container">
      <AdminPageHeader
        title="Home Sections"
        subtitle="Manage homepage sections including hero, features, testimonials, and more"
        testId="home-sections"
        actions={
          <Button onClick={handleAdd} data-testid="button-add-section">
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        }
      />

      <Card className="p-6" data-testid="card-filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
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
              <SelectItem value="hero">Hero</SelectItem>
              <SelectItem value="features">Features</SelectItem>
              <SelectItem value="testimonials">Testimonials</SelectItem>
              <SelectItem value="stats">Stats</SelectItem>
              <SelectItem value="cta">CTA</SelectItem>
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

      <Card data-testid="card-sections-table">
        {isLoading ? (
          <div className="p-8 text-center" data-testid="loading-state">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="p-8 text-center" data-testid="empty-state">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No sections found</h3>
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first homepage section"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSections.map((section) => (
                <TableRow key={section.id} data-testid={`row-section-${section.id}`}>
                  <TableCell className="font-medium" data-testid={`text-title-${section.id}`}>
                    {section.title || <span className="text-muted-foreground">(No title)</span>}
                  </TableCell>
                  <TableCell>{getTypeBadge(section.sectionType)}</TableCell>
                  <TableCell data-testid={`text-order-${section.id}`}>
                    {section.displayOrder}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={section.active ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleActive(section)}
                      data-testid={`button-toggle-status-${section.id}`}
                    >
                      {section.active ? "Active" : "Inactive"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(section)}
                        data-testid={`button-edit-${section.id}`}
                        title="Edit section"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(section)}
                        data-testid={`button-delete-${section.id}`}
                        title="Delete section"
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

      <HomeSectionFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        section={selectedSection}
      />

      <AlertDialog open={!!sectionToDelete} onOpenChange={() => setSectionToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? This action cannot be undone.
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
