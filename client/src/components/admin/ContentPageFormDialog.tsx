import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
}

interface Props {
  open: boolean;
  onClose: () => void;
  page?: ContentPage | null;
}

const formSchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(1, "Title is required"),
  titleAr: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  contentAr: z.string().optional(),
  pageType: z.enum(['legal', 'company', 'support']),
  status: z.enum(['draft', 'published', 'archived']),
  metaTitle: z.string().optional(),
  metaTitleAr: z.string().optional(),
  metaDescription: z.string().optional(),
  metaDescriptionAr: z.string().optional(),
  displayOrder: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof formSchema>;

export function ContentPageFormDialog({ open, onClose, page }: Props) {
  const { toast } = useToast();
  const [contentEn, setContentEn] = useState("");
  const [contentAr, setContentAr] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      title: "",
      titleAr: "",
      content: "",
      contentAr: "",
      pageType: 'legal',
      status: 'draft',
      metaTitle: "",
      metaTitleAr: "",
      metaDescription: "",
      metaDescriptionAr: "",
      displayOrder: 0,
    },
  });

  useEffect(() => {
    if (page) {
      form.reset({
        slug: page.slug,
        title: page.title,
        titleAr: page.titleAr || "",
        content: page.content,
        contentAr: page.contentAr || "",
        pageType: page.pageType,
        status: page.status,
        metaTitle: page.metaTitle || "",
        metaTitleAr: page.metaTitleAr || "",
        metaDescription: page.metaDescription || "",
        metaDescriptionAr: page.metaDescriptionAr || "",
        displayOrder: page.displayOrder,
      });
      setContentEn(page.content);
      setContentAr(page.contentAr || "");
    } else {
      form.reset({
        slug: "",
        title: "",
        titleAr: "",
        content: "",
        contentAr: "",
        pageType: 'legal',
        status: 'draft',
        metaTitle: "",
        metaTitleAr: "",
        metaDescription: "",
        metaDescriptionAr: "",
        displayOrder: 0,
      });
      setContentEn("");
      setContentAr("");
    }
  }, [page, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest('POST', '/api/admin/content-pages', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-pages'] });
      toast({
        title: "Success",
        description: "Content page created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create content page",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest('PATCH', `/api/admin/content-pages/${page?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-pages'] });
      toast({
        title: "Success",
        description: "Content page updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update content page",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      content: contentEn,
      contentAr: contentAr || undefined,
      titleAr: data.titleAr || undefined,
      metaTitle: data.metaTitle || undefined,
      metaTitleAr: data.metaTitleAr || undefined,
      metaDescription: data.metaDescription || undefined,
      metaDescriptionAr: data.metaDescriptionAr || undefined,
    };

    if (page) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'link'
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-content-page-form">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {page ? "Edit Content Page" : "Create Content Page"}
          </DialogTitle>
          <DialogDescription>
            {page ? "Update the content page details below" : "Create a new content page for your website"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
                <TabsTrigger value="seo" data-testid="tab-seo">SEO</TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Terms & Conditions" data-testid="input-title" />
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
                        <Input {...field} placeholder="e.g., الشروط والأحكام" dir="rtl" data-testid="input-title-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content (English)</FormLabel>
                      <FormControl>
                        <div className="border rounded-md" data-testid="editor-content-en">
                          <ReactQuill
                            theme="snow"
                            value={contentEn}
                            onChange={(value) => {
                              setContentEn(value);
                              field.onChange(value);
                            }}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Write your content here..."
                          />
                        </div>
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
                        <div className="border rounded-md" dir="rtl" data-testid="editor-content-ar">
                          <ReactQuill
                            theme="snow"
                            value={contentAr}
                            onChange={(value) => {
                              setContentAr(value);
                              field.onChange(value);
                            }}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="اكتب المحتوى هنا..."
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SEO title for search engines" data-testid="input-meta-title" />
                      </FormControl>
                      <FormDescription>
                        Recommended: 50-60 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metaTitleAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title (Arabic)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="عنوان تحسين محركات البحث" dir="rtl" data-testid="input-meta-title-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Brief description for search results" data-testid="input-meta-description" />
                      </FormControl>
                      <FormDescription>
                        Recommended: 150-160 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metaDescriptionAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description (Arabic)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="وصف مختصر لنتائج البحث" dir="rtl" data-testid="input-meta-description-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., terms-client" data-testid="input-slug" />
                      </FormControl>
                      <FormDescription>
                        URL-friendly identifier (lowercase, numbers, hyphens only)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-page-type">
                            <SelectValue placeholder="Select page type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="legal">Legal</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only published pages are visible on the website
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-display-order"
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first in lists
                      </FormDescription>
                      <FormMessage />
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
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : page ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
