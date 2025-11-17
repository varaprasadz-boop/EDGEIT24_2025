import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Users, Target, Award, Clock, Eye } from "lucide-react";

interface PlatformBidAnalytics {
  totalBids: number;
  totalActiveJobs: number;
  avgBidsPerJob: number;
  avgAcceptanceTime: number;
  platformWinRate: number;
  totalBidValue: number;
  bidsByType: {
    service: number;
    hardware: number;
    software: number;
  };
  bidsByStatus: {
    pending: number;
    accepted: number;
    declined: number;
    withdrawn: number;
  };
  topConsultants: {
    id: string;
    name: string;
    totalBids: number;
    acceptedBids: number;
    winRate: number;
  }[];
  topCategories: {
    categoryName: string;
    totalBids: number;
    avgBidValue: number;
  }[];
  monthlyStats: {
    month: string;
    bids: number;
    accepted: number;
    totalValue: number;
  }[];
}

export function AdminBidAnalytics() {
  const { data: analytics, isLoading } = useQuery<PlatformBidAnalytics>({
    queryKey: ["/api/admin/bid-analytics"],
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
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-bids">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bids">
              {analytics.totalBids.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.bidsByStatus.pending} pending review
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-jobs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-jobs">
              {analytics.totalActiveJobs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {analytics.avgBidsPerJob.toFixed(1)} bids per job
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-value">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bid Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-value">
              ﷼{analytics.totalBidValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all bids
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-platform-win-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Win Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-platform-win-rate">
              {analytics.platformWinRate.toFixed(1)}%
            </div>
            <Progress value={analytics.platformWinRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="consultants" data-testid="tab-consultants">Top Consultants</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">Top Categories</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bids by Type</CardTitle>
                <CardDescription>Distribution of bid types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Service-Based</span>
                    <span className="font-semibold">{analytics.bidsByType.service}</span>
                  </div>
                  <Progress value={(analytics.bidsByType.service / analytics.totalBids) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hardware Supply</span>
                    <span className="font-semibold">{analytics.bidsByType.hardware}</span>
                  </div>
                  <Progress value={(analytics.bidsByType.hardware / analytics.totalBids) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Software License</span>
                    <span className="font-semibold">{analytics.bidsByType.software}</span>
                  </div>
                  <Progress value={(analytics.bidsByType.software / analytics.totalBids) * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bids by Status</CardTitle>
                <CardDescription>Current bid status distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Pending</span>
                  </div>
                  <Badge variant="secondary">{analytics.bidsByStatus.pending}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Accepted</span>
                  </div>
                  <Badge variant="default">{analytics.bidsByStatus.accepted}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Declined</span>
                  </div>
                  <Badge variant="destructive">{analytics.bidsByStatus.declined}</Badge>
                </div>
                {analytics.bidsByStatus.withdrawn > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Withdrawn</span>
                    </div>
                    <Badge variant="outline">{analytics.bidsByStatus.withdrawn}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="consultants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Performing Consultants</CardTitle>
              <CardDescription>Based on bid activity and win rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topConsultants.map((consultant, idx) => (
                  <div key={consultant.id} className="space-y-2" data-testid={`consultant-${idx}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <span className="font-medium">{consultant.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {consultant.acceptedBids}/{consultant.totalBids} wins
                        </span>
                        <Badge variant={consultant.winRate > 40 ? "default" : "secondary"}>
                          {consultant.winRate.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={consultant.winRate} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most Active Categories</CardTitle>
              <CardDescription>Categories with highest bid activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topCategories.map((category, idx) => (
                  <div key={idx} className="flex items-center justify-between" data-testid={`category-${idx}`}>
                    <div className="flex-1">
                      <p className="font-medium">{category.categoryName}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.totalBids} bids
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">﷼{category.avgBidValue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Avg bid value</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Trends</CardTitle>
              <CardDescription>Platform bidding activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.monthlyStats.map((stat, idx) => (
                  <div key={idx} className="space-y-2" data-testid={`month-${idx}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{stat.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {stat.accepted}/{stat.bids} accepted
                        </span>
                        <span className="font-semibold">﷼{stat.totalValue.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <span>{stat.bids} total bids</span>
                      <span>{((stat.accepted / stat.bids) * 100).toFixed(0)}% acceptance rate</span>
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
