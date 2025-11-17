import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send } from "lucide-react";

const rfqSchema = z.object({
  message: z.string().min(20, "Message must be at least 20 characters"),
  deadline: z.string().min(1, "Deadline is required"),
  templateData: z.record(z.any()).optional(),
});

type RFQFormValues = z.infer<typeof rfqSchema>;

interface RFQInvitationDialogProps {
  jobId: string;
  consultantId: string;
  consultantName: string;
  open: boolean;
  onClose: () => void;
}

export function RFQInvitationDialog({
  jobId,
  consultantId,
  consultantName,
  open,
  onClose,
}: RFQInvitationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RFQFormValues>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      message: "",
      deadline: "",
      templateData: {},
    },
  });

  const sendRFQMutation = useMutation({
    mutationFn: async (data: RFQFormValues) => {
      return await apiRequest("POST", `/api/jobs/${jobId}/rfq/invite`, {
        consultantId,
        ...data,
      });
    },
    onSuccess: () => {
      toast({
        title: "RFQ invitation sent",
        description: `Your invitation has been sent to ${consultantName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "rfq"] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send RFQ",
        description: error.message || "An error occurred while sending the invitation.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RFQFormValues) => {
    sendRFQMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-rfq-invitation">
        <DialogHeader>
          <DialogTitle>Send RFQ Invitation</DialogTitle>
          <DialogDescription>
            Invite {consultantName} to submit a bid for this project
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invitation Message</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Explain why you're interested in this consultant and any specific requirements..."
                      rows={6}
                      data-testid="textarea-rfq-message"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide context about your project and why you think this consultant is a good fit.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Response Deadline</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      data-testid="input-rfq-deadline"
                    />
                  </FormControl>
                  <FormDescription>
                    Set a deadline for the consultant to respond to your invitation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={sendRFQMutation.isPending}
                data-testid="button-cancel-rfq"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendRFQMutation.isPending}
                data-testid="button-send-rfq"
              >
                {sendRFQMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
