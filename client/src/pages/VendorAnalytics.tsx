import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, TrendingUp, Award, Target, BarChart3 } from "lucide-react";

interface VendorEarningsResponse {
  totalEarnings: string;
  period: string;
  earningsByPeriod: Array<{ date: string; amount: string }>;
  earningsByCategory: Array<{ categoryName: string; amount: string }>;
}

interface VendorPerformanceResponse {
  completionRate: number;
  bidWinRate: number;
  currentPerformanceScore: number;
  scoreHistory: Array<{ month: string; score: number }>;
}

export default function VendorAnalytics() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  
  const { data: earnings, isLoading: earningsLoading } = useQuery<VendorEarningsResponse>({
    queryKey: ['/api/analytics/vendor/earnings', period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/vendor/earnings?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch earnings');
      return res.json();
    },
  });

  const { data: performance, isLoading: performanceLoading } = useQuery<VendorPerformanceResponse>({
    queryKey: ['/api/analytics/vendor/performance'],
  });

  // Derive safe defaults from query results
  const earningsByPeriod = earnings?.earningsByPeriod ?? [];
  const earningsByCategory = earnings?.earningsByCategory ?? [];
  const scoreHistory = performance?.scoreHistory ?? [];

  const handleExport = async (reportType: string) => {
    try {
      const res = await fetch('/api/analytics/vendor/export-csv', {
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
      a.download = `vendor-${reportType}-${Date.now()}.csv`;
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
          <p className="text-muted-foreground mt-1">Track your earnings and performance metrics</p>
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

      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="earnings" data-testid="tab-earnings">
            <TrendingUp className="w-4 h-4 mr-2" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <Award className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          {earningsLoading ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">Loading earnings data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-earnings">
                      {earnings?.totalEarnings || '0.00'} SAR
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      For selected period
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-top-category">
                      {earningsByCategory[0]?.categoryName || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {earningsByCategory[0]?.amount || '0.00'} SAR
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
                      {earnings?.period || 'Monthly'}
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
                    <CardTitle>Earnings Trend</CardTitle>
                    <CardDescription>Revenue over time</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExport('earnings')} data-testid="button-export-earnings">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {earningsByPeriod.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={earningsByPeriod}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="amount" name="Earnings (SAR)" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No earnings data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Earnings by Category</CardTitle>
                  <CardDescription>Revenue breakdown by service category</CardDescription>
                </CardHeader>
                <CardContent>
                  {earningsByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={earningsByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoryName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="amount" name="Earnings (SAR)" fill="hsl(var(--primary))" />
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

        <TabsContent value="performance" className="space-y-4">
          {performanceLoading ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">Loading performance data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-completion-rate">
                      {((performance?.completionRate || 0) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Projects completed on time
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bid Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-bid-win-rate">
                      {((performance?.bidWinRate || 0) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Successful bids
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-performance-score">
                      {(performance?.currentPerformanceScore || 0).toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Out of 100
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Score History</CardTitle>
                  <CardDescription>Last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  {scoreHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={scoreHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="score" name="Performance Score" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No performance history available</p>
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
