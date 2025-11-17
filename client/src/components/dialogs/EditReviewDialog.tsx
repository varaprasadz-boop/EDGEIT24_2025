import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReviewSchema, type InsertReview, type Review } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Star, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EditReviewDialogProps {
  review: Review;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_COMMENT_LENGTH = 2000;

export function EditReviewDialog({ review, open, onOpenChange }: EditReviewDialogProps) {
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState("");

  const form = useForm<Partial<InsertReview>>({
    resolver: zodResolver(insertReviewSchema.partial()),
    defaultValues: {
      rating: review.rating,
      comment: review.comment || "",
      wouldWorkAgain: review.wouldWorkAgain ?? true,
      isPublic: review.isPublic ?? true,
      qualityRating: review.qualityRating || undefined,
      communicationRating: review.communicationRating || undefined,
      deadlineRating: review.deadlineRating || undefined,
      professionalismRating: review.professionalismRating || undefined,
      valueRating: review.valueRating || undefined,
      communicationClarityRating: review.communicationClarityRating || undefined,
      requirementsClarityRating: review.requirementsClarityRating || undefined,
      paymentPromptnessRating: review.paymentPromptnessRating || undefined,
      clientProfessionalismRating: review.clientProfessionalismRating || undefined,
    },
  });

  useEffect(() => {
    const updateCountdown = () => {
      if (!review.canEditUntil) return;
      const deadline = new Date(review.canEditUntil);
      const now = new Date();
      if (now >= deadline) {
        setTimeRemaining("Edit window expired");
        return;
      }
      setTimeRemaining(formatDistanceToNow(deadline, { addSuffix: true }));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [review.canEditUntil]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertReview>) => {
      return apiRequest('PUT', `/api/reviews/${review.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Review updated",
        description: "Your changes have been saved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update review",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: Partial<InsertReview>) => {
    updateMutation.mutate(data);
  };

  const renderStars = (value: number, onChange: (rating: number) => void, label: string) => {
    return (
      <div className="grid grid-cols-2 gap-4 items-center">
        <FormLabel className="text-sm font-normal">{label}</FormLabel>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`h-5 w-5 ${
                  star <= value
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-review">
        <DialogHeader>
          <DialogTitle>Edit Review</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-amber-600">
            <Clock className="h-4 w-4" />
            Edit window closes {timeRemaining}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Rating</FormLabel>
                  <FormControl>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => field.onChange(star)}
                          className="focus:outline-none transition-transform hover:scale-110"
                          data-testid={`star-rating-${star}`}
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= (field.value || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share details about your experience..."
                      className="min-h-[120px] resize-none"
                      maxLength={MAX_COMMENT_LENGTH}
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-comment"
                    />
                  </FormControl>
                  <FormDescription>
                    {(field.value?.length || 0)}/{MAX_COMMENT_LENGTH} characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {review.reviewType === 'for_consultant' && (
              <div className="space-y-4">
                <div className="text-sm font-medium">Detailed Ratings</div>
                <FormField
                  control={form.control}
                  name="qualityRating"
                  render={({ field }) => (
                    <FormItem>
                      {renderStars(field.value || 0, field.onChange, "Quality of Work")}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="communicationRating"
                  render={({ field }) => (
                    <FormItem>
                      {renderStars(field.value || 0, field.onChange, "Communication")}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadlineRating"
                  render={({ field }) => (
                    <FormItem>
                      {renderStars(field.value || 0, field.onChange, "Deadline Adherence")}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="professionalismRating"
                  render={({ field }) => (
                    <FormItem>
                      {renderStars(field.value || 0, field.onChange, "Professionalism")}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valueRating"
                  render={({ field }) => (
                    <FormItem>
                      {renderStars(field.value || 0, field.onChange, "Value for Money")}
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="wouldWorkAgain"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Would work with them again</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      data-testid="switch-would-work-again"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Make review public</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      data-testid="switch-public"
                    />
                  </FormControl>
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
                disabled={updateMutation.isPending}
                data-testid="button-save"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
