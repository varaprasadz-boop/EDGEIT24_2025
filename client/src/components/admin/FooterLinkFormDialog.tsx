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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

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
}

interface Props {
  open: boolean;
  onClose: () => void;
  link?: FooterLink | null;
}

const formSchema = z.object({
  label: z.string().min(1, "Label is required"),
  labelAr: z.string().optional(),
  url: z.string().min(1, "URL is required"),
  section: z.enum(['company', 'legal', 'support']),
  displayOrder: z.number().min(0).default(0),
  isExternal: z.boolean().default(false),
  openInNewTab: z.boolean().default(false),
  active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export function FooterLinkFormDialog({ open, onClose, link }: Props) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      labelAr: "",
      url: "",
      section: 'company',
      displayOrder: 0,
      isExternal: false,
      openInNewTab: false,
      active: true,
    },
  });

  useEffect(() => {
    if (link) {
      form.reset({
        label: link.label,
        labelAr: link.labelAr || "",
        url: link.url,
        section: link.section,
        displayOrder: link.displayOrder,
        isExternal: link.isExternal,
        openInNewTab: link.openInNewTab,
        active: link.active,
      });
    } else {
      form.reset({
        label: "",
        labelAr: "",
        url: "",
        section: 'company',
        displayOrder: 0,
        isExternal: false,
        openInNewTab: false,
        active: true,
      });
    }
  }, [link, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest('/api/admin/footer-links', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/footer-links'] });
      toast({
        title: "Success",
        description: "Footer link created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create footer link",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest(`/api/admin/footer-links/${link?.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/footer-links'] });
      toast({
        title: "Success",
        description: "Footer link updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update footer link",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      labelAr: data.labelAr || undefined,
    };

    if (link) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-footer-link-form">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {link ? "Edit Footer Link" : "Create Footer Link"}
          </DialogTitle>
          <DialogDescription>
            {link ? "Update the footer link details below" : "Create a new footer navigation link"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (English)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., About Us" data-testid="input-label" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="labelAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (Arabic)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., من نحن" dir="rtl" data-testid="input-label-ar" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., /legal/about-us or https://example.com" data-testid="input-url" />
                  </FormControl>
                  <FormDescription>
                    Internal links start with /. External links include full URL
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-section">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
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
                      Lower numbers appear first
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="isExternal"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-is-external"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">External Link</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openInNewTab"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-open-in-new-tab"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Open in New Tab</FormLabel>
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
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-active"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Active</FormLabel>
                    <FormDescription className="ml-6">
                      Only active links appear in the footer
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

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
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : link ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
