import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Award, Filter } from "lucide-react";
import { ReviewCard } from "./ReviewCard";
import type { Review } from "@shared/schema";

interface ConsultantReviewsSectionProps {
  consultantId: string;
  consultantName: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
}

export function ConsultantReviewsSection({ 
  consultantId,
  consultantName 
}: ConsultantReviewsSectionProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'rating_high' | 'rating_low' | 'helpful'>('recent');
  const [filterRating, setFilterRating] = useState<string>('all');

  const { data: stats, isLoading: statsLoading } = useQuery<ReviewStats>({
    queryKey: [`/api/reviews/${consultantId}/stats`],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: [`/api/reviews/${consultantId}`],
  });

  const sortedAndFilteredReviews = () => {
    if (!reviews) return [];
    
    let filtered = [...reviews];
    
    // Filter by rating
    if (filterRating !== 'all') {
      const rating = parseInt(filterRating);
      filtered = filtered.filter(r => r.rating === rating);
    }
    
    // Sort
    switch (sortBy) {
      case 'rating_high':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating_low':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case 'helpful':
        filtered.sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    
    return filtered;
  };

  const renderRatingDistribution = () => {
    if (!stats || statsLoading) return null;
    
    const breakdown = stats.ratingBreakdown;
    const total = stats.totalReviews;
    
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = breakdown[rating] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-20">
                <span className="text-sm font-medium">{rating}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                  data-testid={`rating-bar-${rating}`}
                />
              </div>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!reviews || reviews.length === 0) return null;
    
    // Calculate average ratings for consultant-specific criteria
    const consultantReviews = reviews.filter(r => r.reviewType === 'for_consultant');
    if (consultantReviews.length === 0) return null;
    
    const metrics = {
      quality: 0,
      communication: 0,
      deadline: 0,
      professionalism: 0,
      value: 0,
      counts: {
        quality: 0,
        communication: 0,
        deadline: 0,
        professionalism: 0,
        value: 0,
      }
    };
    
    consultantReviews.forEach(review => {
      if (review.qualityRating) {
        metrics.quality += review.qualityRating;
        metrics.counts.quality++;
      }
      if (review.communicationRating) {
        metrics.communication += review.communicationRating;
        metrics.counts.communication++;
      }
      if (review.deadlineRating) {
        metrics.deadline += review.deadlineRating;
        metrics.counts.deadline++;
      }
      if (review.professionalismRating) {
        metrics.professionalism += review.professionalismRating;
        metrics.counts.professionalism++;
      }
      if (review.valueRating) {
        metrics.value += review.valueRating;
        metrics.counts.value++;
      }
    });
    
    const avgMetrics = [
      { 
        label: 'Quality', 
        value: metrics.counts.quality > 0 ? metrics.quality / metrics.counts.quality : 0,
        count: metrics.counts.quality
      },
      { 
        label: 'Communication', 
        value: metrics.counts.communication > 0 ? metrics.communication / metrics.counts.communication : 0,
        count: metrics.counts.communication
      },
      { 
        label: 'Deadline', 
        value: metrics.counts.deadline > 0 ? metrics.deadline / metrics.counts.deadline : 0,
        count: metrics.counts.deadline
      },
      { 
        label: 'Professionalism', 
        value: metrics.counts.professionalism > 0 ? metrics.professionalism / metrics.counts.professionalism : 0,
        count: metrics.counts.professionalism
      },
      { 
        label: 'Value', 
        value: metrics.counts.value > 0 ? metrics.value / metrics.counts.value : 0,
        count: metrics.counts.value
      },
    ].filter(m => m.count > 0);
    
    if (avgMetrics.length === 0) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {avgMetrics.map((metric) => (
          <div key={metric.label} className="space-y-1">
            <div className="text-xs text-muted-foreground">{metric.label}</div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= Math.round(metric.value)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">
                {metric.value.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (statsLoading || reviewsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-pulse text-muted-foreground">
              Loading reviews...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="section-consultant-reviews">
      {/* Overall Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Consultant Reviews
          </CardTitle>
          <CardDescription>
            Reviews and ratings for {consultantName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Overall Rating */}
            <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-muted/30 rounded-lg">
              <div className="text-5xl font-bold" data-testid="text-average-rating">
                {stats?.averageRating.toFixed(1) || '0.0'}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${
                      star <= Math.round(stats?.averageRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground" data-testid="text-total-reviews">
                Based on {stats?.totalReviews || 0} reviews
              </div>
            </div>

            {/* Right: Rating Distribution */}
            <div>
              <div className="text-sm font-medium mb-3">Rating Distribution</div>
              {renderRatingDistribution()}
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Performance Metrics</span>
            </div>
            {renderPerformanceMetrics()}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Sort */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filter & Sort</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-rating">
                  <SelectValue placeholder="All ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ratings</SelectItem>
                  <SelectItem value="5">5 stars</SelectItem>
                  <SelectItem value="4">4 stars</SelectItem>
                  <SelectItem value="3">3 stars</SelectItem>
                  <SelectItem value="2">2 stars</SelectItem>
                  <SelectItem value="1">1 star</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[160px]" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="rating_high">Highest rated</SelectItem>
                  <SelectItem value="rating_low">Lowest rated</SelectItem>
                  <SelectItem value="helpful">Most helpful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedAndFilteredReviews().length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No reviews found matching your filters
            </CardContent>
          </Card>
        ) : (
          sortedAndFilteredReviews().map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              reviewerName="Client"
              showActions={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
