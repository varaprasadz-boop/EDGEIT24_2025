import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const reviewFormSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  revieweeId: z.string().min(1, "Consultant ID is required"),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  communication: z.number().min(1).max(5).optional(),
  quality: z.number().min(1).max(5).optional(),
  timeliness: z.number().min(1).max(5).optional(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

interface Project {
  id: string;
  title: string;
}

interface ReviewFormProps {
  projectId?: string;
  consultantId: string;
  consultantName: string;
  projects?: Project[];
  onSuccess?: () => void;
}

export function ReviewForm({ projectId, consultantId, consultantName, projects = [], onSuccess }: ReviewFormProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [overallRating, setOverallRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      projectId: projectId || "",
      revieweeId: consultantId,
      rating: 0,
      comment: "",
      communication: undefined,
      quality: undefined,
      timeliness: undefined,
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      if (!user?.id) {
        throw new Error("You must be logged in to submit a review");
      }
      const payload = {
        projectId: data.projectId,
        reviewerId: user.id,
        revieweeId: data.revieweeId,
        rating: data.rating,
        comment: data.comment || null,
        categories: {
          communication: data.communication,
          quality: data.quality,
          timeliness: data.timeliness,
        },
      };
      return apiRequest('POST', '/api/reviews', payload);
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/client'] });
      form.reset();
      setOverallRating(0);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to submit review",
        description: error.message || "Please try again later",
      });
    },
  });

  const onSubmit = (data: ReviewFormData) => {
    createReviewMutation.mutate(data);
  };

  const renderStars = (
    value: number,
    onChange: (rating: number) => void,
    label?: string,
    testIdPrefix?: string
  ) => {
    return (
      <div className="space-y-2">
        {label && <div className="text-sm font-medium">{label}</div>}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                onChange(star);
                if (!label) {
                  setOverallRating(star);
                  form.setValue('rating', star);
                }
              }}
              onMouseEnter={() => !label && setHoverRating(star)}
              onMouseLeave={() => !label && setHoverRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
              data-testid={testIdPrefix ? `${testIdPrefix}-${star}` : `star-rating-${star}`}
            >
              <Star
                className={`h-8 w-8 ${
                  star <= (label ? value : (hoverRating || overallRating))
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        {!label && (
          <div className="text-sm text-muted-foreground">
            {overallRating === 0 && "Click to rate"}
            {overallRating === 1 && "Poor"}
            {overallRating === 2 && "Fair"}
            {overallRating === 3 && "Good"}
            {overallRating === 4 && "Very Good"}
            {overallRating === 5 && "Excellent"}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card data-testid="card-review-form">
      <CardHeader>
        <CardTitle>Review {consultantName}</CardTitle>
        <CardDescription>
          Share your experience working with this consultant
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {!projectId && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="Select the project you worked on" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.length === 0 ? (
                          <SelectItem value="" disabled>No completed projects available</SelectItem>
                        ) : (
                          projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the project you want to review
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Rating *</FormLabel>
                  <FormControl>
                    <div>
                      {renderStars(field.value, field.onChange)}
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
                      placeholder="Share details about your experience with this consultant..."
                      className="min-h-[120px] resize-none"
                      {...field}
                      data-testid="textarea-review-comment"
                    />
                  </FormControl>
                  <FormDescription>
                    Help others by sharing specific details about your experience
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="text-sm font-medium">Rate Specific Areas (Optional)</div>
              
              <FormField
                control={form.control}
                name="communication"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <FormLabel className="text-sm font-normal">Communication</FormLabel>
                      <div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => field.onChange(star)}
                              className="focus:outline-none"
                              data-testid={`star-communication-${star}`}
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  star <= (field.value || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quality"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <FormLabel className="text-sm font-normal">Quality of Work</FormLabel>
                      <div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => field.onChange(star)}
                              className="focus:outline-none"
                              data-testid={`star-quality-${star}`}
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  star <= (field.value || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeliness"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <FormLabel className="text-sm font-normal">Timeliness</FormLabel>
                      <div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => field.onChange(star)}
                              className="focus:outline-none"
                              data-testid={`star-timeliness-${star}`}
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  star <= (field.value || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={createReviewMutation.isPending || overallRating === 0}
              className="w-full"
              data-testid="button-submit-review"
            >
              {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
