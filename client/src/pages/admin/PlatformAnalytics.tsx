import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, Users, TrendingUp, DollarSign, BarChart3 } from "lucide-react";

interface PlatformGrowthResponse {
  totalUsers: number;
  totalClients: number;
  totalConsultants: number;
  newRegistrationsThisMonth: number;
  activeProjects: number;
  userGrowthByMonth: Array<{ month: string; clients: number; consultants: number }>;
}

interface PlatformRevenueResponse {
  totalGMV: string;
  platformRevenue: string;
  totalTransactions: number;
  gmvByMonth: Array<{ month: string; gmv: string }>;
  revenueByCategory: Array<{ categoryName: string; revenue: string }>;
}

interface CategoryPerformanceResponse {
  categories: Array<{
    categoryId: string;
    categoryName: string;
    jobsPosted: number;
    totalBids: number;
    successRate: number;
    avgBudget: string;
  }>;
}

export default function PlatformAnalytics() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  
  const { data: growth, isLoading: growthLoading} = useQuery<PlatformGrowthResponse>({
    queryKey: ['/api/admin/analytics/growth', period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/growth?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch growth');
      return res.json();
    },
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery<PlatformRevenueResponse>({
    queryKey: ['/api/admin/analytics/revenue', period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/revenue?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch revenue');
      return res.json();
    },
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<CategoryPerformanceResponse>({
    queryKey: ['/api/admin/analytics/categories'],
  });

  // Derive safe defaults from query results
  const userGrowthByMonth = growth?.userGrowthByMonth ?? [];
  const gmvByMonth = revenue?.gmvByMonth ?? [];
  const revenueByCategory = revenue?.revenueByCategory ?? [];
  const categoryList = categories?.categories ?? [];

  const handleExport = async (reportType: string) => {
    try {
      const res = await fetch('/api/admin/analytics/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, period }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-${reportType}-${Date.now()}.csv`;
      a.setAttribute('data-testid', `link-download-${reportType}-csv`);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">Monitor platform growth, revenue, and performance</p>
        </div>
        <Select value={period} onValueChange={(value) => setPeriod(value as any)}>
          <SelectTrigger className="w-[180px]" data-testid="select-period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Users className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            <DollarSign className="w-4 h-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <BarChart3 className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {growthLoading ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">Loading growth data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-users">
                      {growth?.totalUsers || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All platform users
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-clients">
                      {growth?.totalClients || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Client accounts
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Consultants</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-consultants">
                      {growth?.totalConsultants || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consultant accounts
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-new-registrations">
                      {growth?.newRegistrationsThisMonth || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      New registrations
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1">
                  <div>
                    <CardTitle>User Growth Trend</CardTitle>
                    <CardDescription>Client and consultant registration trends</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExport('growth')} data-testid="button-export-growth">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {userGrowthByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={userGrowthByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="clients" name="Clients" stroke="hsl(var(--primary))" strokeWidth={2} />
                        <Line type="monotone" dataKey="consultants" name="Consultants" stroke="hsl(var(--secondary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No growth data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {revenueLoading ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">Loading revenue data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-gmv">
                      {revenue?.totalGMV} SAR
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gross merchandise value
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-platform-revenue">
                      {revenue?.platformRevenue} SAR
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      15% commission
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-transactions">
                      {revenue?.totalTransactions || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment transactions
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>GMV Trend</CardTitle>
                  <CardDescription>Gross merchandise value over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {gmvByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={gmvByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="gmv" name="GMV (SAR)" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No GMV data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Category</CardTitle>
                  <CardDescription>GMV breakdown by service category</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoryName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue (SAR)" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No revenue category data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {categoriesLoading ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">Loading category data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1">
                  <div>
                    <CardTitle>Category Performance</CardTitle>
                    <CardDescription>Performance metrics by service category</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExport('categories')} data-testid="button-export-categories">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {categoryList.length > 0 ? (
                    <div className="space-y-4">
                      {categoryList.map((category, index) => (
                        <div key={category.categoryId} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`category-${index}`}>
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`text-category-name-${index}`}>{category.categoryName}</p>
                            <p className="text-sm text-muted-foreground">
                              {category.jobsPosted} jobs • {category.totalBids} bids
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Success: {(category.successRate * 100).toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Avg: {category.avgBudget} SAR</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No category data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
