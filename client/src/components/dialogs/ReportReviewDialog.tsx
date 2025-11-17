import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, AlertCircle } from "lucide-react";

const reportSchema = z.object({
  reason: z.string().min(1, "Please select a reason"),
  description: z.string().min(20, "Please provide more details (at least 20 characters)").max(500),
});

type ReportForm = z.infer<typeof reportSchema>;

interface ReportReviewDialogProps {
  reviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or fake review" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misleading", label: "Misleading or false information" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "conflict", label: "Conflict of interest" },
  { value: "other", label: "Other" },
];

export function ReportReviewDialog({ reviewId, open, onOpenChange }: ReportReviewDialogProps) {
  const { toast } = useToast();

  const form = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: "",
      description: "",
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (data: ReportForm) => {
      return apiRequest('POST', `/api/reviews/${reviewId}/report`, data);
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe. We'll review this report soon.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to submit report",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ReportForm) => {
    reportMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-report-review">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Review
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2 mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm">
              False reports may result in account restrictions. Only report reviews that violate our community guidelines.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Report *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REPORT_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Details *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide specific details about why this review should be reviewed..."
                      className="min-h-[120px] resize-none"
                      maxLength={500}
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value.length}/500 characters (minimum 20)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="destructive"
                disabled={reportMutation.isPending}
                data-testid="button-submit-report"
              >
                {reportMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
