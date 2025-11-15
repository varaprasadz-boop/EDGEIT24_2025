import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

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
}

interface Props {
  open: boolean;
  onClose: () => void;
  section?: HomeSection | null;
}

const formSchema = z.object({
  sectionType: z.enum(['hero', 'features', 'testimonials', 'stats', 'cta']),
  title: z.string().optional(),
  titleAr: z.string().optional(),
  subtitle: z.string().optional(),
  subtitleAr: z.string().optional(),
  content: z.string().optional(),
  contentAr: z.string().optional(),
  imageUrl: z.string().optional(),
  ctaText: z.string().optional(),
  ctaTextAr: z.string().optional(),
  ctaLink: z.string().optional(),
  displayOrder: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export function HomeSectionFormDialog({ open, onClose, section }: Props) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sectionType: 'hero',
      title: "",
      titleAr: "",
      subtitle: "",
      subtitleAr: "",
      content: "",
      contentAr: "",
      imageUrl: "",
      ctaText: "",
      ctaTextAr: "",
      ctaLink: "",
      displayOrder: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (section) {
      form.reset({
        sectionType: section.sectionType,
        title: section.title || "",
        titleAr: section.titleAr || "",
        subtitle: section.subtitle || "",
        subtitleAr: section.subtitleAr || "",
        content: section.content || "",
        contentAr: section.contentAr || "",
        imageUrl: section.imageUrl || "",
        ctaText: section.ctaText || "",
        ctaTextAr: section.ctaTextAr || "",
        ctaLink: section.ctaLink || "",
        displayOrder: section.displayOrder,
        active: section.active,
      });
    } else {
      form.reset({
        sectionType: 'hero',
        title: "",
        titleAr: "",
        subtitle: "",
        subtitleAr: "",
        content: "",
        contentAr: "",
        imageUrl: "",
        ctaText: "",
        ctaTextAr: "",
        ctaLink: "",
        displayOrder: 0,
        active: true,
      });
    }
  }, [section, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest('/api/admin/home-sections', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/home-sections'] });
      toast({
        title: "Success",
        description: "Section created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create section",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest(`/api/admin/home-sections/${section?.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/home-sections'] });
      toast({
        title: "Success",
        description: "Section updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update section",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      title: data.title || undefined,
      titleAr: data.titleAr || undefined,
      subtitle: data.subtitle || undefined,
      subtitleAr: data.subtitleAr || undefined,
      content: data.content || undefined,
      contentAr: data.contentAr || undefined,
      imageUrl: data.imageUrl || undefined,
      ctaText: data.ctaText || undefined,
      ctaTextAr: data.ctaTextAr || undefined,
      ctaLink: data.ctaLink || undefined,
    };

    if (section) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const sectionType = form.watch('sectionType');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-home-section-form">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {section ? "Edit Home Section" : "Create Home Section"}
          </DialogTitle>
          <DialogDescription>
            {section ? "Update the section details below" : "Create a new homepage section"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <FormField
                  control={form.control}
                  name="sectionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!section}>
                        <FormControl>
                          <SelectTrigger data-testid="select-section-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hero">Hero</SelectItem>
                          <SelectItem value="features">Features</SelectItem>
                          <SelectItem value="testimonials">Testimonials</SelectItem>
                          <SelectItem value="stats">Stats</SelectItem>
                          <SelectItem value="cta">Call to Action</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {section ? "Section type cannot be changed after creation" : "Choose the type of section to display"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title (English)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Section title" data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="titleAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title (Arabic)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="عنوان القسم" dir="rtl" data-testid="input-title-ar" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(sectionType === 'hero' || sectionType === 'cta') && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtitle (English)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Section subtitle" data-testid="input-subtitle" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subtitleAr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtitle (Arabic)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="العنوان الفرعي" dir="rtl" data-testid="input-subtitle-ar" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content (English)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Section content or description" rows={4} data-testid="textarea-content" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contentAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content (Arabic)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="محتوى القسم أو الوصف" dir="rtl" rows={4} data-testid="textarea-content-ar" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(sectionType === 'hero' || sectionType === 'features') && (
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/image.jpg" data-testid="input-image-url" />
                        </FormControl>
                        <FormDescription>
                          URL to the section background or feature image
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(sectionType === 'hero' || sectionType === 'cta') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ctaText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA Button Text (English)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Get Started" data-testid="input-cta-text" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ctaTextAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA Button Text (Arabic)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ابدأ الآن" dir="rtl" data-testid="input-cta-text-ar" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="ctaLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CTA Link</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="/register or https://example.com" data-testid="input-cta-link" />
                          </FormControl>
                          <FormDescription>
                            Internal links start with /. External links include full URL
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
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
                          onChange={(e) => field.onChange(e.target.valueAsNumber ?? 0)}
                          data-testid="input-display-order"
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first on the homepage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(value) => field.onChange(value === true)}
                          data-testid="checkbox-active"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">Active</FormLabel>
                        <FormDescription>
                          Only active sections are displayed on the homepage
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : section ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
