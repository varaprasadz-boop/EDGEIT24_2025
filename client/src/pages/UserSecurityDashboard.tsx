import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Shield, LogIn, Monitor, Activity, Trash2, MapPin, Clock } from "lucide-react";
import type { LoginHistory, ActiveSession, UserActivityLog } from "@shared/schema";

export default function UserSecurityDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login-history");

  // Fetch login history
  const { data: loginHistoryData, isLoading: loadingHistory } = useQuery<{
    history: LoginHistory[];
    count: number;
  }>({
    queryKey: ['/api/auth/login-history'],
  });

  // Fetch active sessions
  const { data: sessionsData, isLoading: loadingSessions } = useQuery<{
    sessions: ActiveSession[];
  }>({
    queryKey: ['/api/auth/sessions'],
  });

  // Fetch activity logs
  const { data: activityData, isLoading: loadingActivity } = useQuery<{
    logs: UserActivityLog[];
    count: number;
  }>({
    queryKey: ['/api/activity-logs'],
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to terminate session');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/sessions'] });
      toast({
        title: "Success",
        description: "Session terminated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to terminate session",
        variant: "destructive",
      });
    },
  });

  const handleTerminateSession = (sessionId: string) => {
    if (confirm("Are you sure you want to terminate this session?")) {
      terminateSessionMutation.mutate(sessionId);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Monitor your account activity, manage sessions, and review security events
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="login-history" data-testid="tab-login-history">
            <LogIn className="h-4 w-4 mr-2" />
            Login History
          </TabsTrigger>
          <TabsTrigger value="active-sessions" data-testid="tab-active-sessions">
            <Monitor className="h-4 w-4 mr-2" />
            Active Sessions
          </TabsTrigger>
          <TabsTrigger value="activity-log" data-testid="tab-activity-log">
            <Activity className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* Login History Tab */}
        <TabsContent value="login-history" data-testid="content-login-history">
          <Card>
            <CardHeader>
              <CardTitle>Login History</CardTitle>
              <CardDescription>
                Review all login and logout events for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !loginHistoryData?.history.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No login history found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistoryData.history.map((event) => (
                      <TableRow key={event.id} data-testid={`login-history-row-${event.id}`}>
                        <TableCell>
                          <Badge
                            variant={event.action === 'login' ? 'default' : 'secondary'}
                            data-testid={`badge-action-${event.action}`}
                          >
                            {event.action}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-timestamp-${event.id}`}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-ip-${event.id}`}>
                          {event.ipAddress || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-location-${event.id}`}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {event.location || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-device-${event.id}`}>
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {event.deviceInfo || event.userAgent || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.success ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Success
                            </Badge>
                          ) : (
                            <div>
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mb-1">
                                Failed
                              </Badge>
                              {event.failureReason && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {event.failureReason}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="active-sessions" data-testid="content-active-sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage all devices and browsers currently logged into your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !sessionsData?.sessions.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active sessions found
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionsData.sessions.map((session) => (
                    <Card key={session.id} data-testid={`session-card-${session.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-5 w-5 text-muted-foreground" />
                              <div className="font-medium" data-testid={`session-device-${session.id}`}>
                                {session.deviceInfo || 'Unknown Device'}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                              <div>
                                <div className="font-medium text-foreground mb-1">IP Address</div>
                                <div data-testid={`session-ip-${session.id}`}>{session.ipAddress || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="font-medium text-foreground mb-1">Location</div>
                                <div data-testid={`session-location-${session.id}`}>
                                  {session.location || 'Unknown'}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-foreground mb-1">Last Activity</div>
                                <div data-testid={`session-last-activity-${session.id}`}>
                                  {format(new Date(session.lastActivity), 'MMM dd, yyyy HH:mm')}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-foreground mb-1">Started</div>
                                <div data-testid={`session-created-${session.id}`}>
                                  {format(new Date(session.createdAt), 'MMM dd, yyyy HH:mm')}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleTerminateSession(session.id)}
                            disabled={terminateSessionMutation.isPending}
                            data-testid={`button-terminate-${session.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Terminate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity-log" data-testid="content-activity-log">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Detailed log of all your actions and API requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !activityData?.logs.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity logs found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityData.logs.map((log) => (
                      <TableRow key={log.id} data-testid={`activity-log-row-${log.id}`}>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-action-${log.id}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-resource-${log.id}`}>
                          {log.resource ? (
                            <Badge variant="secondary">{log.resource}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`cell-timestamp-${log.id}`}>
                          {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          {log.method && (
                            <Badge 
                              variant={
                                log.method === 'GET' ? 'outline' :
                                log.method === 'POST' ? 'default' :
                                log.method === 'DELETE' ? 'destructive' :
                                'secondary'
                              }
                              data-testid={`badge-method-${log.id}`}
                            >
                              {log.method}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell data-testid={`cell-endpoint-${log.id}`}>
                          <div className="max-w-xs truncate text-sm font-mono">
                            {log.endpoint || '—'}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-status-${log.id}`}>
                          {log.statusCode && (
                            <Badge
                              variant="outline"
                              className={
                                log.statusCode >= 200 && log.statusCode < 300
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : log.statusCode >= 400
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : ''
                              }
                            >
                              {log.statusCode}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
