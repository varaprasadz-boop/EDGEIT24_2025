import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, MessageSquare, FileText, Calendar, Search, Download, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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

interface MessagingStats {
  totalConversations: number;
  totalMessages: number;
  totalFiles: number;
  totalMeetings: number;
}

interface Conversation {
  id: string;
  title: string;
  type: string;
  archived: boolean;
  createdAt: string;
  lastMessageAt: string | null;
}

export default function AdminMessages() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: stats, isLoading: isStatsLoading, error: statsError } = useQuery<MessagingStats>({
    queryKey: ['/api/admin/messaging/stats'],
  });

  const { data: conversations, isLoading: isConversationsLoading, error: conversationsError } = useQuery<Conversation[]>({
    queryKey: ['/api/admin/messaging/conversations'],
  });

  // Filter conversations based on search, type, and status
  const filteredConversations = conversations?.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || conv.type === typeFilter;
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && !conv.archived) ||
      (statusFilter === "archived" && conv.archived);
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  // Prepare chart data
  const chartData = [
    { name: "Conversations", value: stats?.totalConversations || 0, fill: "hsl(var(--chart-1))" },
    { name: "Messages", value: stats?.totalMessages || 0, fill: "hsl(var(--chart-2))" },
    { name: "Files", value: stats?.totalFiles || 0, fill: "hsl(var(--chart-3))" },
    { name: "Meetings", value: stats?.totalMeetings || 0, fill: "hsl(var(--chart-4))" },
  ];

  const chartConfig = {
    conversations: { label: "Conversations", color: "hsl(var(--chart-1))" },
    messages: { label: "Messages", color: "hsl(var(--chart-2))" },
    files: { label: "Files", color: "hsl(var(--chart-3))" },
    meetings: { label: "Meetings", color: "hsl(var(--chart-4))" },
  };

  const handleExportData = () => {
    if (!conversations || !stats) return;

    const exportData = {
      stats,
      conversations: filteredConversations,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messaging-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4 mb-4">
        <AdminPageHeader
          title="Messaging Analytics"
          subtitle="Monitor and moderate platform conversations"
          testId="messages"
          actions={
            <Button onClick={handleExportData} variant="outline" data-testid="button-export-analytics">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          }
        />
      </div>

      {/* Stats Grid */}
      {isStatsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover-elevate" data-testid="card-total-conversations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-total-conversations">{stats.totalConversations}</div>
              <p className="text-xs text-muted-foreground mt-1">Active discussions</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-total-messages">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-total-messages">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground mt-1">Messages sent</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-total-files">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-total-files">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground mt-1">Files shared</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-total-meetings">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-total-meetings">{stats.totalMeetings}</div>
              <p className="text-xs text-muted-foreground mt-1">Meetings scheduled</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Analytics Chart */}
      {stats && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Messaging Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>All Conversations</CardTitle>
            <div className="flex flex-wrap gap-2 w-full max-w-lg">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                data-testid="select-type-filter"
              >
                <option value="all">All Types</option>
                <option value="direct">Direct</option>
                <option value="group">Group</option>
                <option value="support">Support</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                data-testid="select-status-filter"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {conversationsError ? (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-2" />
              <p className="text-destructive font-medium">Failed to load conversations</p>
              <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
            </div>
          ) : isConversationsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredConversations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.map((conv) => (
                  <TableRow key={conv.id} data-testid={`row-conversation-${conv.id}`}>
                    <TableCell className="font-medium">{conv.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{conv.type}</Badge>
                        {conv.archived && <Badge variant="outline">Archived</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(conv.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {conv.lastMessageAt
                        ? format(new Date(conv.lastMessageAt), 'MMM d, yyyy')
                        : 'No messages'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/messages/${conv.id}`)}
                        data-testid={`button-view-conversation-${conv.id}`}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                {searchQuery ? 'No conversations match your search' : 'No conversations found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
