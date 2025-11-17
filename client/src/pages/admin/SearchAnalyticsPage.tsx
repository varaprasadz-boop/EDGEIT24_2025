import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Search, AlertCircle, BarChart3 } from 'lucide-react';

export default function SearchAnalyticsPage() {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/admin/search-analytics'],
  });

  const analytics = (analyticsData as any) || {
    popularSearches: [],
    zeroResultQueries: [],
    trendingCategories: [],
    searchMetrics: {
      totalSearches: 0,
      avgResultsPerSearch: 0,
      searchSuccessRate: 0,
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Search Analytics</h1>
        <p className="text-muted-foreground">
          Insights into platform search behavior and performance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <MetricCard
          title="Total Searches"
          value={analytics.searchMetrics?.totalSearches?.toLocaleString() || '0'}
          icon={<Search className="h-5 w-5" />}
          data-testid="metric-total-searches"
        />
        <MetricCard
          title="Avg Results Per Search"
          value={analytics.searchMetrics?.avgResultsPerSearch?.toFixed(1) || '0'}
          icon={<BarChart3 className="h-5 w-5" />}
          data-testid="metric-avg-results"
        />
        <MetricCard
          title="Search Success Rate"
          value={`${analytics.searchMetrics?.searchSuccessRate?.toFixed(1) || '0'}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          data-testid="metric-success-rate"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="popular-searches-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Popular Searches</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Most frequently searched terms
            </p>
          </CardHeader>
          <CardContent>
            {analytics.popularSearches?.length > 0 ? (
              <div className="space-y-3">
                {analytics.popularSearches.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex-1">
                      <div className="font-medium">{item.query || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.searchType === 'requirements' ? 'Project Searches' : 'Consultant Searches'}
                      </div>
                    </div>
                    <Badge variant="secondary">{item.count} searches</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No popular searches data available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="trending-categories-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Trending Categories</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Most searched categories
            </p>
          </CardHeader>
          <CardContent>
            {analytics.trendingCategories?.length > 0 ? (
              <div className="space-y-3">
                {analytics.trendingCategories.map((category: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="font-medium">{category.category || 'Uncategorized'}</div>
                    <Badge variant="secondary">{category.count} searches</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No trending categories data available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2" data-testid="zero-results-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold">Zero Result Queries</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Searches that returned no results - opportunities for improvement
            </p>
          </CardHeader>
          <CardContent>
            {analytics.zeroResultQueries?.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {analytics.zeroResultQueries.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-md">
                    <div className="font-medium">{item.query || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.searchType === 'requirements' ? 'Project Search' : 'Consultant Search'}
                      {' • '}
                      {item.count} attempts
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No zero-result queries found. Great job!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  'data-testid'?: string;
}

function MetricCard({ title, value, icon, 'data-testid': dataTestId }: MetricCardProps) {
  return (
    <Card data-testid={dataTestId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
