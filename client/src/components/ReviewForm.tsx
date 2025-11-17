import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReviewSchema, type InsertReview } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Star, Upload, X, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  title: string;
}

interface ReviewFormProps {
  projectId?: string;
  revieweeId: string;
  revieweeName: string;
  reviewType: 'for_consultant' | 'for_client';
  projects?: Project[];
  onSuccess?: () => void;
}

const MAX_COMMENT_LENGTH = 2000;
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ReviewForm({ 
  projectId, 
  revieweeId, 
  revieweeName, 
  reviewType,
  projects = [], 
  onSuccess 
}: ReviewFormProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [overallRating, setOverallRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<InsertReview>({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: {
      projectId: projectId || "",
      reviewerId: user?.id || "",
      revieweeId,
      reviewType,
      rating: 0,
      comment: "",
      wouldWorkAgain: true,
      isPublic: true,
      // Vendor-specific ratings
      qualityRating: undefined,
      communicationRating: undefined,
      deadlineRating: undefined,
      professionalismRating: undefined,
      valueRating: undefined,
      // Client-specific ratings
      communicationClarityRating: undefined,
      requirementsClarityRating: undefined,
      paymentPromptnessRating: undefined,
      clientProfessionalismRating: undefined,
      attachments: [],
    },
  });

  const commentValue = form.watch("comment") || "";
  const commentLength = commentValue.length;

  const createReviewMutation = useMutation({
    mutationFn: async (data: InsertReview) => {
      if (!user?.id) {
        throw new Error("You must be logged in to submit a review");
      }
      return apiRequest('POST', '/api/reviews', {
        ...data,
        attachments: attachments.length > 0 ? attachments : null
      });
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      form.reset();
      setOverallRating(0);
      setAttachments([]);
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

  const onSubmit = (data: InsertReview) => {
    createReviewMutation.mutate(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      if (attachments.length + newAttachments.length >= MAX_ATTACHMENTS) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
        });
        break;
      }

      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} exceeds 5MB limit`,
        });
        continue;
      }

      // In a real implementation, upload to server and get URL
      // For now, create object URL for preview
      const fileUrl = URL.createObjectURL(file);
      newAttachments.push(fileUrl);
    }

    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
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

  const renderDetailedRatings = () => {
    if (reviewType === 'for_consultant') {
      return (
        <div className="space-y-4">
          <div className="text-sm font-medium">Rate Specific Areas (Optional)</div>
          
          <FormField
            control={form.control}
            name="qualityRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Quality of Work</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="communicationRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Communication</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deadlineRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Deadline Adherence</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                        data-testid={`star-deadline-${star}`}
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="professionalismRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Professionalism</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                        data-testid={`star-professionalism-${star}`}
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valueRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Value for Money</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                        data-testid={`star-value-${star}`}
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
              </FormItem>
            )}
          />
        </div>
      );
    } else {
      // Client ratings
      return (
        <div className="space-y-4">
          <div className="text-sm font-medium">Rate Specific Areas (Optional)</div>
          
          <FormField
            control={form.control}
            name="communicationClarityRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Communication Clarity</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                        data-testid={`star-communication-clarity-${star}`}
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requirementsClarityRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Requirements Clarity</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                        data-testid={`star-requirements-${star}`}
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentPromptnessRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Payment Promptness</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                        data-testid={`star-payment-${star}`}
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientProfessionalismRating"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormLabel className="text-sm font-normal">Professionalism</FormLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                        data-testid={`star-client-professionalism-${star}`}
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
              </FormItem>
            )}
          />
        </div>
      );
    }
  };

  return (
    <>
      <Card data-testid="card-review-form">
        <CardHeader>
          <CardTitle>Review {revieweeName}</CardTitle>
          <CardDescription>
            Share your experience working with this {reviewType === 'for_consultant' ? 'consultant' : 'client'}
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
                        placeholder="Share details about your experience..."
                        className="min-h-[120px] resize-none"
                        maxLength={MAX_COMMENT_LENGTH}
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-review-comment"
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="flex justify-between items-center">
                        <span>Help others by sharing specific details about your experience</span>
                        <span className={`text-xs ${commentLength > MAX_COMMENT_LENGTH * 0.9 ? 'text-destructive' : ''}`}>
                          {commentLength}/{MAX_COMMENT_LENGTH}
                        </span>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderDetailedRatings()}

              <FormField
                control={form.control}
                name="wouldWorkAgain"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Would work with them again
                      </FormLabel>
                      <FormDescription>
                        Recommend this {reviewType === 'for_consultant' ? 'consultant' : 'client'} to others?
                      </FormDescription>
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
                      <FormLabel className="text-base">
                        Make review public
                      </FormLabel>
                      <FormDescription>
                        Allow others to see this review on the platform
                      </FormDescription>
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

              <div className="space-y-2">
                <FormLabel>Attachments (Optional)</FormLabel>
                <div className="space-y-2">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((url, index) => (
                        <Badge key={index} variant="secondary" className="gap-2">
                          Attachment {index + 1}
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="hover:bg-destructive/10 rounded-full p-0.5"
                            data-testid={`button-remove-attachment-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {attachments.length < MAX_ATTACHMENTS && (
                    <div>
                      <input
                        type="file"
                        id="review-attachments"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      <label htmlFor="review-attachments">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => document.getElementById('review-attachments')?.click()}
                          data-testid="button-upload-attachment"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Attachment
                        </Button>
                      </label>
                    </div>
                  )}
                  
                  <FormDescription>
                    Up to {MAX_ATTACHMENTS} files, 5MB max each (images, PDF, DOC)
                  </FormDescription>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  data-testid="button-preview-review"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                
                <Button
                  type="submit"
                  disabled={createReviewMutation.isPending || overallRating === 0}
                  className="flex-1"
                  data-testid="button-submit-review"
                >
                  {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-review-preview">
          <DialogHeader>
            <DialogTitle>Review Preview</DialogTitle>
            <DialogDescription>
              This is how your review will appear to others
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= overallRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="font-semibold">{overallRating}.0</span>
              </div>
            </div>

            {commentValue && (
              <div>
                <div className="text-sm font-medium mb-2">Review</div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {commentValue}
                </p>
              </div>
            )}

            {reviewType === 'for_consultant' && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Detailed Ratings</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {form.watch('qualityRating') && (
                    <div>Quality: {form.watch('qualityRating')}/5</div>
                  )}
                  {form.watch('communicationRating') && (
                    <div>Communication: {form.watch('communicationRating')}/5</div>
                  )}
                  {form.watch('deadlineRating') && (
                    <div>Deadline: {form.watch('deadlineRating')}/5</div>
                  )}
                  {form.watch('professionalismRating') && (
                    <div>Professionalism: {form.watch('professionalismRating')}/5</div>
                  )}
                  {form.watch('valueRating') && (
                    <div>Value: {form.watch('valueRating')}/5</div>
                  )}
                </div>
              </div>
            )}

            {reviewType === 'for_client' && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Detailed Ratings</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {form.watch('communicationClarityRating') && (
                    <div>Communication: {form.watch('communicationClarityRating')}/5</div>
                  )}
                  {form.watch('requirementsClarityRating') && (
                    <div>Requirements: {form.watch('requirementsClarityRating')}/5</div>
                  )}
                  {form.watch('paymentPromptnessRating') && (
                    <div>Payment: {form.watch('paymentPromptnessRating')}/5</div>
                  )}
                  {form.watch('clientProfessionalismRating') && (
                    <div>Professionalism: {form.watch('clientProfessionalismRating')}/5</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              <Badge variant={form.watch('wouldWorkAgain') ? "default" : "secondary"}>
                {form.watch('wouldWorkAgain') ? "Would work again" : "Would not work again"}
              </Badge>
              <Badge variant={form.watch('isPublic') ? "default" : "secondary"}>
                {form.watch('isPublic') ? "Public" : "Private"}
              </Badge>
            </div>

            {attachments.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Attachments</div>
                <div className="flex gap-2">
                  {attachments.map((_, index) => (
                    <Badge key={index} variant="outline">
                      Attachment {index + 1}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
