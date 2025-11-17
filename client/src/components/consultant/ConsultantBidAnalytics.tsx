import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Eye, CheckCircle, XCircle, Clock, DollarSign, Target, Award, BarChart3 } from "lucide-react";

interface BidAnalytics {
  totalBids: number;
  acceptedBids: number;
  declinedBids: number;
  pendingBids: number;
  withdrawnBids: number;
  totalViews: number;
  totalShortlisted: number;
  totalCompared: number;
  winRate: number;
  avgResponseTime: number;
  avgProposedBudget: number;
  competitivePosition: {
    avgRank: number;
    totalCompetitors: number;
  };
  monthlyTrends: {
    month: string;
    submitted: number;
    accepted: number;
    winRate: number;
  }[];
  categoryPerformance: {
    categoryName: string;
    bids: number;
    wins: number;
    winRate: number;
  }[];
}

export function ConsultantBidAnalytics() {
  const { data: analytics, isLoading } = useQuery<BidAnalytics>({
    queryKey: ["/api/consultant/bid-analytics"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const acceptanceRate = analytics.totalBids > 0
    ? (analytics.acceptedBids / analytics.totalBids) * 100
    : 0;

  const engagementRate = analytics.totalBids > 0
    ? ((analytics.totalViews + analytics.totalShortlisted) / analytics.totalBids) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-bids">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bids">
              {analytics.totalBids}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.pendingBids} pending
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-win-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-win-rate">
              {analytics.winRate.toFixed(1)}%
            </div>
            <Progress value={analytics.winRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-acceptance-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-acceptance-rate">
              {acceptanceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.acceptedBids} of {analytics.totalBids} bids
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-engagement">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-views">
              {analytics.totalViews}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.totalShortlisted} shortlisted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" data-testid="tab-performance">
            Performance
          </TabsTrigger>
          <TabsTrigger value="competitive" data-testid="tab-competitive">
            Competitive Position
          </TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bid Status Breakdown</CardTitle>
                <CardDescription>Current status of all your bids</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between" data-testid="status-accepted">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Accepted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{analytics.acceptedBids}</span>
                    <Badge variant="default">{acceptanceRate.toFixed(0)}%</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between" data-testid="status-pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{analytics.pendingBids}</span>
                    <Badge variant="secondary">
                      {((analytics.pendingBids / analytics.totalBids) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between" data-testid="status-declined">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Declined</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{analytics.declinedBids}</span>
                    <Badge variant="destructive">
                      {((analytics.declinedBids / analytics.totalBids) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                {analytics.withdrawnBids > 0 && (
                  <div className="flex items-center justify-between" data-testid="status-withdrawn">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Withdrawn</span>
                    </div>
                    <span className="font-semibold">{analytics.withdrawnBids}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement Metrics</CardTitle>
                <CardDescription>How clients interact with your bids</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between" data-testid="metric-views">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Total Views</span>
                  </div>
                  <span className="font-semibold">{analytics.totalViews}</span>
                </div>

                <div className="flex items-center justify-between" data-testid="metric-shortlisted">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Shortlisted</span>
                  </div>
                  <span className="font-semibold">{analytics.totalShortlisted}</span>
                </div>

                <div className="flex items-center justify-between" data-testid="metric-compared">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Compared</span>
                  </div>
                  <span className="font-semibold">{analytics.totalCompared}</span>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Engagement Rate</span>
                    <span className="text-lg font-bold">{engagementRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={engagementRate} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance by Category</CardTitle>
              <CardDescription>Your success rate across different categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.categoryPerformance.map((cat, idx) => (
                  <div key={idx} className="space-y-2" data-testid={`category-${idx}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cat.categoryName}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {cat.wins}/{cat.bids} wins
                        </span>
                        <Badge variant={cat.winRate > 50 ? "default" : "secondary"}>
                          {cat.winRate.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={cat.winRate} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Competitive Analysis</CardTitle>
              <CardDescription>How you compare to other consultants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average Rank</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold" data-testid="text-avg-rank">
                      #{analytics.competitivePosition.avgRank.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      out of {analytics.competitivePosition.totalCompetitors} competitors
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average Proposed Budget</p>
                  <div className="flex items-baseline gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-3xl font-bold" data-testid="text-avg-budget">
                      ﷼{analytics.avgProposedBudget.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Insights</p>
                <div className="space-y-2">
                  {analytics.winRate > 30 ? (
                    <div className="flex items-start gap-2 text-sm" data-testid="insight-win-rate">
                      <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                      <p className="text-muted-foreground">
                        Your win rate of {analytics.winRate.toFixed(1)}% is strong. Keep up the good work!
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-sm" data-testid="insight-improve">
                      <TrendingDown className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <p className="text-muted-foreground">
                        Consider improving your proposal quality and pricing strategy.
                      </p>
                    </div>
                  )}

                  {analytics.totalShortlisted > analytics.acceptedBids * 2 && (
                    <div className="flex items-start gap-2 text-sm" data-testid="insight-shortlist">
                      <Award className="h-4 w-4 text-purple-500 mt-0.5" />
                      <p className="text-muted-foreground">
                        You're frequently shortlisted! Focus on follow-ups to convert more.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Trends</CardTitle>
              <CardDescription>Your bidding activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.monthlyTrends.map((trend, idx) => (
                  <div key={idx} className="space-y-2" data-testid={`trend-${idx}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{trend.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {trend.accepted}/{trend.submitted} accepted
                        </span>
                        <Badge variant={trend.winRate > 30 ? "default" : "secondary"}>
                          {trend.winRate.toFixed(0)}% win rate
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{trend.submitted} submitted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">{trend.accepted} accepted</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
