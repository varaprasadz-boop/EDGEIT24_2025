import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Award, Filter, MessageCircle } from "lucide-react";
import { ReviewCard } from "./ReviewCard";
import type { Review } from "@shared/schema";

interface ClientReviewsSectionProps {
  clientId: string;
  clientName: string;
}

export function ClientReviewsSection({ 
  clientId,
  clientName 
}: ClientReviewsSectionProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'rating_high' | 'rating_low' | 'helpful'>('recent');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');

  const { data: reviewsData, isLoading } = useQuery<{ received: Review[]; given: Review[] }>({
    queryKey: [`/api/reviews/client/${clientId}`],
  });

  const sortAndFilterReviews = (reviews: Review[] | undefined) => {
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

  const calculateAverageRating = (reviews: Review[] | undefined) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  };

  const renderRatingDistribution = (reviews: Review[] | undefined) => {
    if (!reviews || reviews.length === 0) return null;
    
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });
    
    const total = reviews.length;
    
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

  if (isLoading) {
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

  const receivedReviews = reviewsData?.received || [];
  const givenReviews = reviewsData?.given || [];
  const activeReviews = activeTab === 'received' ? receivedReviews : givenReviews;
  const avgRating = calculateAverageRating(activeReviews);

  return (
    <div className="space-y-6" data-testid="section-client-reviews">
      {/* Overall Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Client Reviews
          </CardTitle>
          <CardDescription>
            Reviews for {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received" data-testid="tab-reviews-received">
                <MessageCircle className="h-4 w-4 mr-2" />
                Received ({receivedReviews.length})
              </TabsTrigger>
              <TabsTrigger value="given" data-testid="tab-reviews-given">
                <Star className="h-4 w-4 mr-2" />
                Given ({givenReviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6 mt-6">
              {activeReviews.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left: Overall Rating */}
                  <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-muted/30 rounded-lg">
                    <div className="text-5xl font-bold" data-testid="text-average-rating">
                      {avgRating.toFixed(1)}
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-6 w-6 ${
                            star <= Math.round(avgRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid="text-total-reviews">
                      Based on {activeReviews.length} reviews
                    </div>
                  </div>

                  {/* Right: Rating Distribution */}
                  <div>
                    <div className="text-sm font-medium mb-3">Rating Distribution</div>
                    {renderRatingDistribution(activeReviews)}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Filters and Sort */}
      {activeReviews.length > 0 && (
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
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {sortAndFilterReviews(activeReviews).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              {activeReviews.length === 0 
                ? `No reviews ${activeTab === 'received' ? 'received' : 'given'} yet`
                : 'No reviews found matching your filters'
              }
            </CardContent>
          </Card>
        ) : (
          sortAndFilterReviews(activeReviews).map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              reviewerName={activeTab === 'received' ? 'Consultant' : clientName}
              showActions={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
