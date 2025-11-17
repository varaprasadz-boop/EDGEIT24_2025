import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Star, 
  ThumbsUp, 
  Flag, 
  Edit2, 
  MessageSquare, 
  FileText, 
  CheckCircle,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Review } from "@shared/schema";

interface ReviewCardProps {
  review: Review;
  reviewerName?: string;
  reviewerAvatar?: string;
  response?: {
    id: string;
    responseText: string;
    responderId: string;
    createdAt: Date;
  };
  onEdit?: () => void;
  onReport?: () => void;
  onResponse?: () => void;
  showActions?: boolean;
}

export function ReviewCard({
  review,
  reviewerName = "Anonymous",
  reviewerAvatar,
  response,
  onEdit,
  onReport,
  onResponse,
  showActions = true,
}: ReviewCardProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [isHelpful, setIsHelpful] = useState(
    review.helpfulBy?.includes(user?.id || "") || false
  );

  const toggleHelpfulMutation = useMutation({
    mutationFn: async () => {
      if (isHelpful) {
        return apiRequest('DELETE', `/api/reviews/${review.id}/helpful`);
      } else {
        return apiRequest('POST', `/api/reviews/${review.id}/helpful`);
      }
    },
    onSuccess: () => {
      setIsHelpful(!isHelpful);
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update helpful status",
        description: error.message,
      });
    },
  });

  const canEdit = user?.id === review.reviewerId && 
    review.canEditUntil && 
    new Date() < new Date(review.canEditUntil);

  const canRespond = user?.id === review.revieweeId && !response;

  const renderStars = (rating: number, size: 'sm' | 'md' = 'md') => {
    const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderDetailedRatings = () => {
    if (review.reviewType === 'for_consultant') {
      const ratings = [
        { label: 'Quality', value: review.qualityRating },
        { label: 'Communication', value: review.communicationRating },
        { label: 'Deadline', value: review.deadlineRating },
        { label: 'Professionalism', value: review.professionalismRating },
        { label: 'Value', value: review.valueRating },
      ].filter(r => r.value !== null && r.value !== undefined);

      if (ratings.length === 0) return null;

      return (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {ratings.map((rating) => (
            <div key={rating.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{rating.label}</span>
              <div className="flex items-center gap-1">
                {renderStars(rating.value!, 'sm')}
                <span className="text-xs text-muted-foreground ml-1">
                  {rating.value}/5
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      // Client ratings
      const ratings = [
        { label: 'Communication', value: review.communicationClarityRating },
        { label: 'Requirements', value: review.requirementsClarityRating },
        { label: 'Payment', value: review.paymentPromptnessRating },
        { label: 'Professionalism', value: review.clientProfessionalismRating },
      ].filter(r => r.value !== null && r.value !== undefined);

      if (ratings.length === 0) return null;

      return (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {ratings.map((rating) => (
            <div key={rating.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{rating.label}</span>
              <div className="flex items-center gap-1">
                {renderStars(rating.value!, 'sm')}
                <span className="text-xs text-muted-foreground ml-1">
                  {rating.value}/5
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <Card data-testid={`card-review-${review.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarImage src={reviewerAvatar} />
              <AvatarFallback>
                {reviewerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold" data-testid="text-reviewer-name">
                  {reviewerName}
                </span>
                {review.isVerified && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span data-testid="text-review-date">
                  {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                </span>
                {review.editedAt && (
                  <>
                    <span>•</span>
                    <span className="italic">edited</span>
                  </>
                )}
                {canEdit && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      <span>
                        Can edit for {formatDistanceToNow(new Date(review.canEditUntil!))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {renderStars(review.rating)}
              <span className="font-semibold text-lg" data-testid="text-rating">
                {review.rating}.0
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {review.comment && (
          <p className="text-sm whitespace-pre-wrap" data-testid="text-review-comment">
            {review.comment}
          </p>
        )}

        {renderDetailedRatings()}

        <div className="flex flex-wrap items-center gap-2">
          {review.wouldWorkAgain !== null && (
            <Badge 
              variant={review.wouldWorkAgain ? "default" : "secondary"}
              data-testid="badge-would-work-again"
            >
              {review.wouldWorkAgain ? "Would work again" : "Would not work again"}
            </Badge>
          )}
          
          {!review.isPublic && (
            <Badge variant="outline" data-testid="badge-private">
              Private Review
            </Badge>
          )}
        </div>

        {Array.isArray(review.attachments) && review.attachments.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Attachments ({review.attachments.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {review.attachments.map((attachment: string, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(attachment, '_blank')}
                  data-testid={`button-attachment-${index}`}
                >
                  <FileText className="h-3 w-3" />
                  Attachment {index + 1}
                </Button>
              ))}
            </div>
          </div>
        )}

        {response && (
          <div className="border-l-4 border-primary/20 pl-4 space-y-2 bg-muted/30 p-3 rounded-r-md">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Response from{' '}
                {review.reviewType === 'for_consultant' ? 'Consultant' : 'Client'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-review-response">
              {response.responseText}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(response.createdAt), { addSuffix: true })}
            </p>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleHelpfulMutation.mutate()}
              disabled={!user || toggleHelpfulMutation.isPending}
              className={isHelpful ? "text-primary" : ""}
              data-testid="button-helpful"
            >
              <ThumbsUp className={`h-4 w-4 mr-1 ${isHelpful ? 'fill-current' : ''}`} />
              Helpful {(review.helpful ?? 0) > 0 && `(${review.helpful})`}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {canRespond && onResponse && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResponse}
                data-testid="button-respond"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Respond
              </Button>
            )}

            {canEdit && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                data-testid="button-edit"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}

            {user && user.id !== review.reviewerId && onReport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReport}
                data-testid="button-report"
              >
                <Flag className="h-4 w-4 mr-1" />
                Report
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
