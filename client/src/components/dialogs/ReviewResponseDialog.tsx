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
import { MessageSquare } from "lucide-react";

const responseSchema = z.object({
  responseText: z.string().min(10, "Response must be at least 10 characters").max(1000, "Response must be under 1000 characters"),
});

type ResponseForm = z.infer<typeof responseSchema>;

interface ReviewResponseDialogProps {
  reviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewResponseDialog({ reviewId, open, onOpenChange }: ReviewResponseDialogProps) {
  const { toast } = useToast();

  const form = useForm<ResponseForm>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      responseText: "",
    },
  });

  const createResponseMutation = useMutation({
    mutationFn: async (data: ResponseForm) => {
      return apiRequest('POST', `/api/reviews/${reviewId}/response`, data);
    },
    onSuccess: () => {
      toast({
        title: "Response posted",
        description: "Your response has been added to the review",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to post response",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ResponseForm) => {
    createResponseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-review-response">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Respond to Review
          </DialogTitle>
          <DialogDescription>
            You can post one response to this review. Choose your words carefully as responses cannot be edited.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="responseText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Response</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Thank the reviewer or address any concerns..."
                      className="min-h-[150px] resize-none"
                      maxLength={1000}
                      {...field}
                      data-testid="textarea-response"
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value.length}/1000 characters
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
                disabled={createResponseMutation.isPending}
                data-testid="button-post-response"
              >
                {createResponseMutation.isPending ? "Posting..." : "Post Response"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
