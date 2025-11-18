import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, DollarSign, Users, TrendingUp, Target } from "lucide-react";

interface ClientSpendingResponse {
  totalSpending: string;
  period: string;
  spendingByPeriod: Array<{ date: string; amount: string }>;
  spendingByCategory: Array<{ categoryName: string; amount: string }>;
}

interface ClientHiringResponse {
  projectsPosted: number;
  projectsCompleted: number;
  successRate: number;
  topVendors: Array<{
    vendorId: string;
    vendorName: string;
    totalProjects: number;
    totalSpent: string;
    avgRating: string;
  }>;
}

export default function ClientAnalytics() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  
  const { data: spending, isLoading: spendingLoading } = useQuery<ClientSpendingResponse>({
    queryKey: ['/api/analytics/client/spending', period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/client/spending?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch spending');
      return res.json();
    },
  });

  const { data: hiring, isLoading: hiringLoading } = useQuery<ClientHiringResponse>({
    queryKey: ['/api/analytics/client/hiring'],
  });

  // Derive safe defaults from query results
  const spendingByPeriod = spending?.spendingByPeriod ?? [];
  const spendingByCategory = spending?.spendingByCategory ?? [];
  const topVendors = hiring?.topVendors ?? [];

  const handleExport = async (reportType: string) => {
    try {
      const res = await fetch('/api/analytics/client/export-csv', {
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
      a.download = `client-${reportType}-${Date.now()}.csv`;
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
          <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your spending and hiring metrics</p>
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

      <Tabs defaultValue="spending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="spending" data-testid="tab-spending">
            <DollarSign className="w-4 h-4 mr-2" />
            Spending
          </TabsTrigger>
          <TabsTrigger value="hiring" data-testid="tab-hiring">
            <Users className="w-4 h-4 mr-2" />
            Hiring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spending" className="space-y-4">
          {spendingLoading ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">Loading spending data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-spending">
                      {spending?.totalSpending || '0.00'} SAR
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      For selected period
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-top-category">
                      {spendingByCategory[0]?.categoryName || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {spendingByCategory[0]?.amount || '0.00'} SAR
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Period Type</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize" data-testid="text-period-type">
                      {spending?.period || 'Monthly'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reporting period
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1">
                  <div>
                    <CardTitle>Spending Trend</CardTitle>
                    <CardDescription>Expenditure over time</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExport('spending')} data-testid="button-export-spending">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {spendingByPeriod.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={spendingByPeriod}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="amount" name="Spending (SAR)" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No spending data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                  <CardDescription>Expenditure breakdown by service category</CardDescription>
                </CardHeader>
                <CardContent>
                  {spendingByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={spendingByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoryName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="amount" name="Spending (SAR)" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No category data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="hiring" className="space-y-4">
          {hiringLoading ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">Loading hiring data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projects Posted</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-projects-posted">
                      {hiring?.projectsPosted || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total projects
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projects Completed</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-projects-completed">
                      {hiring?.projectsCompleted || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Successfully finished
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-success-rate">
                      {((hiring?.successRate || 0) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completion rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Vendors</CardTitle>
                  <CardDescription>Most frequently hired consultants</CardDescription>
                </CardHeader>
                <CardContent>
                  {topVendors.length > 0 ? (
                    <div className="space-y-4">
                      {topVendors.map((vendor, index) => (
                        <div key={vendor.vendorId} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`vendor-${index}`}>
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`text-vendor-name-${index}`}>{vendor.vendorName}</p>
                            <p className="text-sm text-muted-foreground">
                              {vendor.totalProjects} projects • {vendor.totalSpent} SAR
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Rating: {parseFloat(vendor.avgRating).toFixed(1)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No vendor data available</p>
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
