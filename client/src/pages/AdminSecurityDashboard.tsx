import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity, Users, LogIn, AlertTriangle, Download, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

interface SecurityStats {
  totalUsers: number;
  totalLogins: number;
  failedLogins: number;
  activeSessions: number;
}

interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  method: string;
  endpoint: string;
  statusCode: number;
  timestamp: string;
  metadata: any;
}

export default function AdminSecurityDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<number>(7); // days

  // Protect admin route
  const { user, isLoading: isAuthLoading } = useAuthContext();

  useEffect(() => {
    if (!isAuthLoading && user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      setLocation('/dashboard');
    }
  }, [user, isAuthLoading, setLocation, toast]);

  // Fetch security stats
  const { data: stats, isLoading: isStatsLoading } = useQuery<SecurityStats>({
    queryKey: ['/api/admin/security/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/security/stats');
      return res.json();
    },
    enabled: !!user && user.role === 'admin',
  });

  // Fetch activity logs with filters
  const { data: activityLogs, isLoading: isActivityLoading } = useQuery<UserActivityLog[]>({
    queryKey: ['/api/admin/activity-logs', dateRange, actionFilter, resourceFilter],
    queryFn: async () => {
      const startDate = subDays(new Date(), dateRange).toISOString();
      const endDate = new Date().toISOString();
      
      const activityParams = new URLSearchParams({
        limit: '100',
        startDate,
        endDate,
      });
      
      if (actionFilter !== "all") activityParams.append('action', actionFilter);
      if (resourceFilter !== "all") activityParams.append('resource', resourceFilter);
      
      const res = await apiRequest('GET', `/api/admin/activity-logs?${activityParams.toString()}`);
      return res.json();
    },
    enabled: !!user && user.role === 'admin',
  });

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // Block access if not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Filter activity logs
  const filteredLogs = activityLogs?.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  // Prepare chart data for activity trends
  const activityByDay = filteredLogs.reduce((acc, log) => {
    const day = format(new Date(log.timestamp), 'MMM dd');
    if (!acc[day]) acc[day] = 0;
    acc[day]++;
    return acc;
  }, {} as Record<string, number>);

  const trendChartData = Object.entries(activityByDay).map(([day, count]) => ({
    day,
    count,
  }));

  // Stats card data
  const statsCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Logins",
      value: stats?.totalLogins || 0,
      icon: LogIn,
      color: "text-green-600",
    },
    {
      title: "Failed Logins",
      value: stats?.failedLogins || 0,
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "Active Sessions",
      value: stats?.activeSessions || 0,
      icon: Activity,
      color: "text-purple-600",
    },
  ];

  const chartConfig = {
    count: { label: "Activity Count", color: "hsl(var(--chart-1))" },
  };

  const handleExportData = () => {
    if (!filteredLogs || !stats) return;

    const exportData = {
      stats,
      activityLogs: filteredLogs,
      filters: {
        dateRange: `Last ${dateRange} days`,
        action: actionFilter,
        resource: resourceFilter,
        search: searchQuery,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-data-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Security data has been exported successfully.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
            <Shield className="w-8 h-8" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            System-wide security monitoring and analytics
          </p>
        </div>
        <Button onClick={handleExportData} variant="outline" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} data-testid={`stat-card-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-value-${index}`}>
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Trends (Last {dateRange} Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {trendChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No activity data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>

            <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-action">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="page_view">Page View</SelectItem>
                <SelectItem value="api_call">API Call</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-resource">
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="profile">Profile</SelectItem>
                <SelectItem value="job">Job</SelectItem>
                <SelectItem value="bid">Bid</SelectItem>
                <SelectItem value="message">Message</SelectItem>
                <SelectItem value="session">Session</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Activity Logs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isActivityLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-action-${log.id}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-resource-${log.id}`}>
                          {log.resource}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.method} {log.endpoint}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.statusCode >= 400 ? "destructive" : "default"}
                          data-testid={`badge-status-${log.id}`}
                        >
                          {log.statusCode}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length > 50 && (
            <p className="text-sm text-muted-foreground text-center">
              Showing first 50 of {filteredLogs.length} results. Use filters to narrow down results.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
