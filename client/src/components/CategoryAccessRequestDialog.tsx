import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lock, Upload, FileText } from "lucide-react";

const requestSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  yearsOfExperience: z.number().int().min(0, "Experience must be at least 0 years").optional(),
  reasonForRequest: z.string().min(20, "Please provide a detailed reason (minimum 20 characters)").optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface CategoryAccessRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
}

export function CategoryAccessRequestDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
}: CategoryAccessRequestDialogProps) {
  const { toast } = useToast();

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      categoryId,
      yearsOfExperience: undefined,
      reasonForRequest: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      return await apiRequest<any>({
        url: '/api/category-requests',
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your category access request has been submitted for admin review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/category-requests'] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to submit category access request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    submitMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-category-access-request">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <DialogTitle data-testid="text-dialog-title">Request Category Access</DialogTitle>
          </div>
          <DialogDescription data-testid="text-dialog-description">
            Submit a request to access <strong>{categoryName}</strong>. This category requires admin approval before you can bid on jobs.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="yearsOfExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Experience</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g., 5"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                          field.onChange(value);
                        }}
                        data-testid="input-years-experience"
                      />
                    </FormControl>
                    <FormDescription>
                      How many years of experience do you have in this category?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reasonForRequest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Request</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why you're requesting access to this category, your relevant experience, qualifications, and how you plan to use it..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-reason"
                      />
                    </FormControl>
                    <FormDescription>
                      Provide details about your qualifications and why you need access (minimum 20 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted p-4 rounded-md space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Supporting Documents (Optional)</p>
                    <p>You can upload certifications, portfolio samples, or other credentials later in your consultant profile to strengthen your request.</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                data-testid="button-submit-request"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
