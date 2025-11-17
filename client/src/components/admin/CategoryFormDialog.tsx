import { useState, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import CustomFieldsBuilder from "./CustomFieldsBuilder";
import type { CustomField } from "@shared/schema";

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
  categoryType: z.enum([
    'human_services', 'software_services', 'hardware_supply', 'digital_marketing',
    'infrastructure', 'cloud_services', 'cybersecurity', 'data_services'
  ]).optional(),
  requiresApproval: z.boolean().default(false),
  customFields: z.any().optional(),
  deliveryOptions: z.any().optional(),
  warrantyConfig: z.any().optional(),
  complianceRequirements: z.array(z.string().min(1, "Requirement cannot be empty")).optional(),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

const commonIcons = [
  "Code", "Briefcase", "Users", "TrendingUp", "BarChart", "ShoppingCart",
  "Package", "Smartphone", "Monitor", "Server", "Database", "Cloud",
  "Cpu", "Wifi", "Lock", "Shield", "Mail", "MessageSquare",
  "Phone", "Video", "Camera", "Image", "FileText", "Folder",
  "Settings", "Tool", "Wrench", "Hammer", "Palette", "Pen",
];

const categoryTypeLabels = {
  human_services: "Human Services",
  software_services: "Software Services",
  hardware_supply: "Hardware Supply",
  digital_marketing: "Digital Marketing",
  infrastructure: "Infrastructure",
  cloud_services: "Cloud Services",
  cybersecurity: "Cybersecurity",
  data_services: "Data Services",
};

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues: CategoryFormData;
  onSubmit: (data: CategoryFormData) => void;
  isPending: boolean;
  parentName?: string | null;
}

export default function CategoryFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  onSubmit,
  isPending,
  parentName,
}: CategoryFormDialogProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [complianceInput, setComplianceInput] = useState("");
  const [shippingMethodInput, setShippingMethodInput] = useState("");

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
  });

  // Reset form when dialog opens/closes or default values change
  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setActiveTab("basic");
    }
  }, [open, defaultValues, form]);

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  const addComplianceRequirement = () => {
    if (!complianceInput.trim()) return;
    
    const current = form.getValues("complianceRequirements") || [];
    form.setValue("complianceRequirements", [...current, complianceInput.trim()]);
    setComplianceInput("");
  };

  const removeComplianceRequirement = (index: number) => {
    const current = form.getValues("complianceRequirements") || [];
    form.setValue("complianceRequirements", current.filter((_, i) => i !== index));
  };

  const addShippingMethod = () => {
    if (!shippingMethodInput.trim()) return;
    
    const current = form.getValues("deliveryOptions") || { shippingMethods: [], estimatedDays: null, feeStructure: null };
    const methods = current.shippingMethods || [];
    form.setValue("deliveryOptions", { ...current, shippingMethods: [...methods, shippingMethodInput.trim()] });
    setShippingMethodInput("");
  };

  const removeShippingMethod = (index: number) => {
    const current = form.getValues("deliveryOptions") || { shippingMethods: [] };
    const methods = current.shippingMethods || [];
    form.setValue("deliveryOptions", { ...current, shippingMethods: methods.filter((_, i) => i !== index) });
  };

  const categoryType = form.watch("categoryType");
  const complianceRequirements = form.watch("complianceRequirements") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-category">
            {mode === "create" ? "Create" : "Edit"} Category
            {parentName && <Badge variant="outline" className="ml-2">Child of: {parentName}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Create a new category with optional custom fields, delivery options, and more."
              : "Edit category details, custom fields, and configuration."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full" data-testid="tabs-category-form">
                <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
                <TabsTrigger value="fields" data-testid="tab-fields">Custom Fields</TabsTrigger>
                <TabsTrigger value="delivery" data-testid="tab-delivery">Delivery</TabsTrigger>
                <TabsTrigger value="warranty" data-testid="tab-warranty">Warranty</TabsTrigger>
                <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Info */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English)*</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug*</FormLabel>
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
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (English)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="textarea-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descriptionAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Arabic)</FormLabel>
                        <FormControl>
                          <Textarea {...field} dir="rtl" rows={3} data-testid="textarea-descriptionAr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category-type">
                              <SelectValue placeholder="Select a type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(categoryTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Defines category-specific features and requirements</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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
                </div>

                <FormField
                  control={form.control}
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

                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="requiresApproval"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-requiresApproval"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Requires Approval</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
              </TabsContent>

              {/* Tab 2: Custom Fields */}
              <TabsContent value="fields" className="mt-4">
                <FormField
                  control={form.control}
                  name="customFields"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFieldsBuilder
                        fields={(field.value as CustomField[]) || []}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab 3: Delivery Options */}
              <TabsContent value="delivery" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Configure delivery and shipping options for hardware products (applicable for Hardware Supply categories).
                </p>
                {categoryType !== 'hardware_supply' && (
                  <Badge variant="secondary">This configuration is most relevant for Hardware Supply categories</Badge>
                )}
                
                <FormField
                  control={form.control}
                  name="deliveryOptions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Configuration (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"shippingMethods": ["Standard", "Express"], "estimatedDays": "3-5", "feeStructure": "Standard: SAR 25, Express: SAR 50"}'
                          value={field.value ? JSON.stringify(field.value, null, 2) : ""}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              field.onChange(parsed);
                            } catch {
                              field.onChange(e.target.value);
                            }
                          }}
                          rows={6}
                          className="font-mono text-sm"
                          data-testid="textarea-delivery-options"
                        />
                      </FormControl>
                      <FormDescription>
                        Configure shipping methods, delivery times, and fee structure in JSON format
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab 4: Warranty Config */}
              <TabsContent value="warranty" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Define warranty and support requirements for products/services in this category.
                </p>
                
                <FormField
                  control={form.control}
                  name="warrantyConfig"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty Configuration (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"duration": "1 year", "terms": "Limited warranty covering manufacturing defects", "supportOptions": ["Email", "Phone"]}'
                          value={field.value ? JSON.stringify(field.value, null, 2) : ""}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              field.onChange(parsed);
                            } catch {
                              field.onChange(e.target.value);
                            }
                          }}
                          rows={6}
                          className="font-mono text-sm"
                          data-testid="textarea-warranty-config"
                        />
                      </FormControl>
                      <FormDescription>
                        Define warranty duration, terms, and support requirements in JSON format
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab 5: Compliance Requirements */}
              <TabsContent value="compliance" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Specify compliance requirements, certifications, or credentials required for consultants in this category.
                </p>
                
                <div className="space-y-3">
                  <FormLabel>Compliance Requirements</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={complianceInput}
                      onChange={(e) => setComplianceInput(e.target.value)}
                      placeholder="e.g., ISO 27001 Certification"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addComplianceRequirement())}
                      data-testid="input-compliance-requirement"
                    />
                    <Button
                      type="button"
                      onClick={addComplianceRequirement}
                      variant="outline"
                      data-testid="button-add-compliance"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {complianceRequirements.length > 0 && (
                    <div className="space-y-2">
                      {complianceRequirements.map((req, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md hover-elevate">
                          <span data-testid={`text-compliance-${index}`}>{req}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeComplianceRequirement(index)}
                            data-testid={`button-remove-compliance-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {complianceRequirements.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No compliance requirements defined yet.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel-category"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-category"
              >
                {isPending ? "Saving..." : mode === "create" ? "Create Category" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
