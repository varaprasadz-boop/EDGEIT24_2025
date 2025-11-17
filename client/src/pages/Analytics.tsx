import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface ConsultantAnalytics {
  totalEarnings: string;
  completedProjects: number;
  activeProjects: number;
  averageRating: number;
  totalReviews: number;
  bidSuccessRate: number;
  responseTime: number | null;
}

interface ClientAnalytics {
  totalSpending: string;
  activeProjects: number;
  completedProjects: number;
  totalBids: number;
  averageProjectValue: string;
}

export default function Analytics() {
  const { user } = useAuthContext();
  const isConsultant = user?.role === 'consultant' || user?.role === 'both';
  const isClient = user?.role === 'client' || user?.role === 'both';

  const { data: consultantAnalytics, isLoading: consultantLoading } = useQuery<ConsultantAnalytics>({
    queryKey: ['/api/analytics/consultant'],
    enabled: isConsultant,
  });

  const { data: clientAnalytics, isLoading: clientLoading } = useQuery<ClientAnalytics>({
    queryKey: ['/api/analytics/client'],
    enabled: isClient,
  });

  if (!user) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">View your performance metrics and insights</p>
      </div>

      {isConsultant && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Consultant Performance</h2>
          {consultantLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : consultantAnalytics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-total-earnings">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <CardDescription className="text-2xl font-bold">{consultantAnalytics.totalEarnings} SAR</CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-completed-projects">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
                  <CardDescription className="text-2xl font-bold">{consultantAnalytics.completedProjects}</CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-average-rating">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <CardDescription className="text-2xl font-bold">
                    {consultantAnalytics.averageRating.toFixed(1)} / 5.0
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-bid-success-rate">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Bid Success Rate</CardTitle>
                  <CardDescription className="text-2xl font-bold">
                    {consultantAnalytics.bidSuccessRate.toFixed(0)}%
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-active-projects">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                  <CardDescription className="text-2xl font-bold">{consultantAnalytics.activeProjects}</CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-total-reviews">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                  <CardDescription className="text-2xl font-bold">{consultantAnalytics.totalReviews}</CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-response-time">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <CardDescription className="text-2xl font-bold">
                    {consultantAnalytics.responseTime ? `${consultantAnalytics.responseTime} min` : 'N/A'}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          ) : null}
        </div>
      )}

      {isClient && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Client Activity</h2>
          {clientLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : clientAnalytics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-client-total-spending">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
                  <CardDescription className="text-2xl font-bold">{clientAnalytics.totalSpending} SAR</CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-client-active-projects">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                  <CardDescription className="text-2xl font-bold">{clientAnalytics.activeProjects}</CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-client-completed-projects">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
                  <CardDescription className="text-2xl font-bold">{clientAnalytics.completedProjects}</CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-client-total-bids">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Bids Received</CardTitle>
                  <CardDescription className="text-2xl font-bold">{clientAnalytics.totalBids}</CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-avg-project-value">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Avg Project Value</CardTitle>
                  <CardDescription className="text-2xl font-bold">{clientAnalytics.averageProjectValue} SAR</CardDescription>
                </CardHeader>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
