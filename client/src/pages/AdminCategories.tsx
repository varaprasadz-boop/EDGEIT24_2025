import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown,
  Star,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  parentId: string | null;
  level: number;
  name: string;
  nameAr: string | null;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  heroTitle: string | null;
  heroTitleAr: string | null;
  heroDescription: string | null;
  heroDescriptionAr: string | null;
  icon: string | null;
  displayOrder: number;
  featured: boolean;
  active: boolean;
  visible: boolean;
  children?: Category[];
}

const categoryFormSchema = z.object({
  parentId: z.string().nullable(),
  level: z.number().min(0).max(2),
  name: z.string().min(1, "Name is required"),
  nameAr: z.string().optional(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  heroTitle: z.string().optional(),
  heroTitleAr: z.string().optional(),
  heroDescription: z.string().optional(),
  heroDescriptionAr: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().min(0).default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  visible: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

// Common Lucide icon names
const commonIcons = [
  "Code", "Briefcase", "Users", "TrendingUp", "BarChart", "ShoppingCart",
  "Package", "Smartphone", "Monitor", "Server", "Database", "Cloud",
  "Cpu", "Wifi", "Lock", "Shield", "Mail", "MessageSquare",
  "Phone", "Video", "Camera", "Image", "FileText", "Folder",
  "Settings", "Tool", "Wrench", "Hammer", "Palette", "Pen",
];

export default function AdminCategories() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);

  // Fetch category tree
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/categories/tree"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/categories/tree");
      return response.json();
    },
  });

  const tree: Category[] = data?.tree || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await apiRequest("POST", "/api/admin/categories", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories/tree"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      setSelectedParent(null);
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      const response = await apiRequest("PUT", `/api/admin/categories/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories/tree"] });
      setIsEditDialogOpen(false);
      editForm.reset();
      setSelectedCategory(null);
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/admin/categories/${id}/toggle`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to toggle category");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories/tree"] });
      // Check if there's a warning in the response
      if (data.warning) {
        toast({
          title: "Success with Warning",
          description: data.warning,
          variant: "default",
        });
      } else {
        toast({
          title: "Success",
          description: "Category toggled successfully",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/categories/${id}`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories/tree"] });
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    },
  });

  // Forms
  const createForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      parentId: null,
      level: 0,
      name: "",
      nameAr: "",
      slug: "",
      description: "",
      descriptionAr: "",
      heroTitle: "",
      heroTitleAr: "",
      heroDescription: "",
      heroDescriptionAr: "",
      icon: "Briefcase",
      displayOrder: 0,
      featured: false,
      active: true,
      visible: true,
    },
  });

  const editForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
  });

  // Toggle expand/collapse
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // Expand all
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (categories: Category[]) => {
      categories.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          allIds.add(cat.id);
          collectIds(cat.children);
        }
      });
    };
    collectIds(tree);
    setExpandedIds(allIds);
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Get icon component
  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  // Handle create category
  const handleOpenCreate = (parent: Category | null = null) => {
    setSelectedParent(parent);
    createForm.reset({
      parentId: parent?.id || null,
      level: parent ? parent.level + 1 : 0,
      name: "",
      nameAr: "",
      slug: "",
      description: "",
      descriptionAr: "",
      heroTitle: "",
      heroTitleAr: "",
      heroDescription: "",
      heroDescriptionAr: "",
      icon: "Briefcase",
      displayOrder: 0,
      featured: false,
      active: true,
      visible: true,
    });
    setIsCreateDialogOpen(true);
  };

  // Handle edit category
  const handleOpenEdit = (category: Category) => {
    setSelectedCategory(category);
    editForm.reset({
      parentId: category.parentId,
      level: category.level,
      name: category.name,
      nameAr: category.nameAr || "",
      slug: category.slug,
      description: category.description || "",
      descriptionAr: category.descriptionAr || "",
      heroTitle: category.heroTitle || "",
      heroTitleAr: category.heroTitleAr || "",
      heroDescription: category.heroDescription || "",
      heroDescriptionAr: category.heroDescriptionAr || "",
      icon: category.icon || "Briefcase",
      displayOrder: category.displayOrder,
      featured: category.featured,
      active: category.active,
      visible: category.visible,
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete category
  const handleOpenDelete = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  // Render category row
  const renderCategoryRow = (category: Category, depth: number = 0) => {
    const isExpanded = expandedIds.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const displayName = i18n.language === 'ar' && category.nameAr ? category.nameAr : category.name;

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 p-3 border-b hover-elevate active-elevate-2 rounded-md"
          style={{ paddingLeft: `${depth * 2 + 0.75}rem` }}
        >
          {/* Expand/Collapse */}
          <div className="w-6 flex-shrink-0">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleExpand(category.id)}
                data-testid={`button-toggle-${category.id}`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>

          {/* Order */}
          <div className="w-12 text-sm text-muted-foreground" data-testid={`order-${category.id}`}>
            {category.displayOrder + 1}
          </div>

          {/* Icon */}
          <div className="w-8 flex-shrink-0">
            {getIconComponent(category.icon)}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate" data-testid={`name-${category.id}`}>
                {displayName}
              </span>
              {category.featured && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
              <Badge variant="outline" className="text-xs">
                L{category.level}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground truncate" data-testid={`slug-${category.id}`}>
              /{category.slug}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <Badge
              variant={category.active ? "default" : "secondary"}
              data-testid={`status-${category.id}`}
            >
              {category.active ? "Active" : "Inactive"}
            </Badge>
            {!category.visible && (
              <Badge variant="outline" data-testid={`visibility-${category.id}`}>
                <EyeOff className="h-3 w-3 mr-1" />
                Hidden
              </Badge>
            )}
          </div>

          {/* Actions */}
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
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleOpenEdit(category)}
                data-testid={`action-edit-${category.id}`}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {category.level < 2 && (
                <DropdownMenuItem
                  onClick={() => handleOpenCreate(category)}
                  data-testid={`action-add-child-${category.id}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Child
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => toggleMutation.mutate(category.id)}
                data-testid={`action-toggle-${category.id}`}
              >
                {category.active ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {category.active ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleOpenDelete(category)}
                data-testid={`action-delete-${category.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategoryRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Filter out test categories
  const filteredTree = tree.filter(category => 
    !category.slug.startsWith('automation-') && 
    !category.slug.startsWith('test-')
  );

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Action Toolbar */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            data-testid="button-expand-all"
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            data-testid="button-collapse-all"
          >
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => handleOpenCreate()} data-testid="button-add-category">
            <Plus className="mr-2 h-4 w-4" />
            Add Root Category
          </Button>
        </div>

        {/* Tree Table */}
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b bg-muted/50 font-medium text-sm">
            <div className="w-6 flex-shrink-0"></div>
            <div className="w-12">#</div>
            <div className="w-8"></div>
            <div className="flex-1">Name</div>
            <div className="w-32">Status</div>
            <div className="w-16">Actions</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading categories...</div>
          ) : filteredTree.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No categories found</div>
          ) : (
            <div>
              {filteredTree.map(category => renderCategoryRow(category, 0))}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedParent ? `Add Child to "${selectedParent.name}"` : "Add Root Category"}
              </DialogTitle>
              <DialogDescription>
                {selectedParent 
                  ? `Create a new level ${selectedParent.level + 1} category under "${selectedParent.name}"`
                  : "Create a new root category (level 0)"}
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="nameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (Arabic)</FormLabel>
                        <FormControl>
                          <Input {...field} dir="rtl" data-testid="input-nameAr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="lowercase-with-hyphens" data-testid="input-slug" />
                      </FormControl>
                      <FormDescription>URL-friendly identifier (lowercase letters, numbers, hyphens only)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (English)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="descriptionAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Arabic)</FormLabel>
                        <FormControl>
                          <Textarea {...field} dir="rtl" rows={3} data-testid="input-descriptionAr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-icon">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {commonIcons.map(icon => {
                              const Icon = (LucideIcons as any)[icon];
                              return (
                                <SelectItem key={icon} value={icon}>
                                  <div className="flex items-center gap-2">
                                    {Icon && <Icon className="h-4 w-4" />}
                                    {icon}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-displayOrder"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4">
                  <FormField
                    control={createForm.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-featured"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Featured</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-active"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Active</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="visible"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-visible"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Visible</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Category"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog - Similar structure to Create Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update category details for "{selectedCategory?.name}"
              </DialogDescription>
            </DialogHeader>

            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => {
                if (selectedCategory) {
                  updateMutation.mutate({ id: selectedCategory.id, data });
                }
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="nameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (Arabic)</FormLabel>
                        <FormControl>
                          <Input {...field} dir="rtl" data-testid="input-edit-nameAr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="lowercase-with-hyphens" data-testid="input-edit-slug" />
                      </FormControl>
                      <FormDescription>URL-friendly identifier</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (English)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="input-edit-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="descriptionAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Arabic)</FormLabel>
                        <FormControl>
                          <Textarea {...field} dir="rtl" rows={3} data-testid="input-edit-descriptionAr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-icon">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {commonIcons.map(icon => {
                              const Icon = (LucideIcons as any)[icon];
                              return (
                                <SelectItem key={icon} value={icon}>
                                  <div className="flex items-center gap-2">
                                    {Icon && <Icon className="h-4 w-4" />}
                                    {icon}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-edit-displayOrder"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4">
                  <FormField
                    control={editForm.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-featured"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Featured</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-active"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Active</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="visible"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-visible"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Visible</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateMutation.isPending ? "Updating..." : "Update Category"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Category</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedCategory?.name}"?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                This action cannot be undone. The category will be permanently removed.
              </p>
              {selectedCategory?.children && selectedCategory.children.length > 0 && (
                <p className="text-destructive font-medium">
                  ⚠️ This category has {selectedCategory.children.length} child categories. Delete them first.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedCategory && deleteMutation.mutate(selectedCategory.id)}
                disabled={deleteMutation.isPending || (selectedCategory?.children && selectedCategory.children.length > 0)}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
