import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Briefcase,
  FileText,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Star,
  AlertCircle,
  UserCircle,
  Package
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ReviewForm } from "@/components/ReviewForm";
import { CategoryRequestsList } from "@/components/CategoryRequestsList";

interface DashboardStats {
  activeJobs: number;
  totalBids: number;
  totalSpending: string;
  messagesCount: number;
}

interface ConsultantDashboardStats {
  availableJobs: number;
  activeBids: number;
  totalEarnings: string;
  rating: string;
}

interface ProfileStatus {
  role: 'client' | 'consultant';
  profileStatus: 'draft' | 'submitted' | 'complete';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  uniqueId: string | null;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  completionPercentage: number;
  companyName?: string;
  industry?: string;
  fullName?: string;
  title?: string;
}

interface QuoteRequest {
  id: string;
  clientId: string;
  consultantId: string;
  packageName: string;
  projectDescription: string;
  status: 'pending' | 'responded' | 'declined';
  consultantResponse: string | null;
  quotedAmount: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    fullName: string;
    email: string;
    companyName?: string;
  };
}

export default function Dashboard() {
  const { user, isLoading, getSelectedRole } = useAuthContext();
  const selectedRole = getSelectedRole();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [quotedAmount, setQuotedAmount] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewProject, setReviewProject] = useState<any>(null);

  // All hooks at top level (React hooks rules)
  // Profile status queries - only fetch for selected role
  const { data: clientProfileStatus } = useQuery<ProfileStatus>({
    queryKey: ['/api/profile/status', 'client'],
    queryFn: async () => {
      const res = await fetch('/api/profile/status?role=client', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
      }
      return res.json();
    },
    enabled: !!user && selectedRole === 'client',
  });

  const { data: consultantProfileStatus } = useQuery<ProfileStatus>({
    queryKey: ['/api/profile/status', 'consultant'],
    queryFn: async () => {
      const res = await fetch('/api/profile/status?role=consultant', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
      }
      return res.json();
    },
    enabled: !!user && selectedRole === 'consultant',
  });

  // Dashboard stats queries - only fetch for selected role
  const { data: clientStats, isLoading: clientStatsLoading, isError: clientStatsError, refetch: refetchClientStats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/client/stats'],
    enabled: !!user && selectedRole === 'client',
  });

  // Client projects query
  const { data: clientProjects } = useQuery<any[]>({
    queryKey: ['/api/projects/client'],
    queryFn: async () => {
      const res = await fetch('/api/projects/client', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
      }
      return res.json();
    },
    enabled: !!user && selectedRole === 'client',
  });

  const { data: consultantStats, isLoading: consultantStatsLoading, isError: consultantStatsError, refetch: refetchConsultantStats } = useQuery<ConsultantDashboardStats>({
    queryKey: ['/api/dashboard/consultant/stats'],
    enabled: !!user && selectedRole === 'consultant',
  });

  // Consultant metrics query
  const { data: consultantMetrics } = useQuery<{ completionRate: number; totalProjects: number; completedProjects: number }>({
    queryKey: ['/api/consultant/metrics'],
    queryFn: async () => {
      const res = await fetch('/api/consultant/metrics', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
      }
      return res.json();
    },
    enabled: !!user && selectedRole === 'consultant',
  });

  // Consultant review stats query
  const { data: consultantReviewStats } = useQuery<{ averageRating: number; totalReviews: number; ratingBreakdown: Record<number, number> }>({
    queryKey: ['/api/reviews', user?.id, 'stats'],
    queryFn: async () => {
      if (!user?.id) return { averageRating: 0, totalReviews: 0, ratingBreakdown: {} };
      const res = await fetch(`/api/reviews/${user.id}/stats`, { credentials: 'include' });
      if (!res.ok) return { averageRating: 0, totalReviews: 0, ratingBreakdown: {} };
      return res.json();
    },
    enabled: !!user && selectedRole === 'consultant',
  });

  // Consultant performance score query
  const { data: performanceScore, isLoading: performanceScoreLoading, isError: performanceScoreError } = useQuery<{ score: number; breakdown: { ratingScore: number; completionScore: number; responseScore: number } }>({
    queryKey: ['/api/consultant/performance-score'],
    enabled: !!user && selectedRole === 'consultant',
  });

  // Quote requests query for consultants
  const { data: quoteRequests } = useQuery<QuoteRequest[]>({
    queryKey: ['/api/quotes'],
    enabled: !!user && (selectedRole === 'consultant' || user.role === 'both'),
  });

  // Mutation for responding to quote requests
  const respondToQuoteMutation = useMutation({
    mutationFn: async ({ id, response, amount }: { id: string; response: string; amount: string }) => {
      return apiRequest('PATCH', `/api/quotes/${id}`, {
        status: 'responded',
        consultantResponse: response,
        quotedAmount: amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      toast({ 
        title: "Response sent", 
        description: "Your quote response has been sent to the client." 
      });
      setResponseDialogOpen(false);
      setSelectedQuote(null);
      setResponseMessage("");
      setQuotedAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send response. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Redirect admin users to admin portal
  useEffect(() => {
    if (user?.role === 'admin') {
      setLocation('/admin/dashboard');
    }
  }, [user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to view your dashboard</p>
          <Button asChild className="mt-4 bg-primary text-primary-foreground">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  // Render approval status banner for a specific role
  const renderApprovalBanner = (profileStatus: ProfileStatus | undefined) => {
    if (!profileStatus) return null;

    const profileRoute = `/profile/${profileStatus.role}`;

    if (profileStatus.approvalStatus === 'approved') {
      return (
        <Card className="border-primary bg-primary/5" data-testid="card-approval-approved">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-primary">Profile Approved</p>
              <p className="text-sm text-muted-foreground">
                Your unique ID: <span className="font-mono font-semibold text-foreground">{profileStatus.uniqueId}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (profileStatus.approvalStatus === 'pending' && profileStatus.profileStatus === 'submitted') {
      return (
        <Card className="border-amber-500 bg-amber-500/5" data-testid="card-approval-pending">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-700 dark:text-amber-500">Awaiting Admin Review</p>
              <p className="text-sm text-muted-foreground">
                Your profile has been submitted for review. We'll notify you once it's approved.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (profileStatus.approvalStatus === 'rejected') {
      return (
        <Card className="border-destructive bg-destructive/5" data-testid="card-approval-rejected">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Profile Rejected</p>
              {profileStatus.adminNotes && (
                <p className="text-sm text-muted-foreground mt-1">
                  Reason: {profileStatus.adminNotes}
                </p>
              )}
              <Button 
                size="sm" 
                className="mt-2"
                onClick={() => setLocation(profileRoute)}
                data-testid="button-update-profile"
              >
                Update & Resubmit
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Draft status - needs completion
    if (profileStatus.profileStatus === 'draft' && profileStatus.completionPercentage < 100) {
      return (
        <Card className="border-blue-500 bg-blue-500/5" data-testid="card-profile-incomplete">
          <CardContent className="flex items-center gap-3 p-4">
            <UserCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-700 dark:text-blue-500">Complete Your Profile</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profile completion</span>
                  <span className="font-medium">{profileStatus.completionPercentage}%</span>
                </div>
                <Progress value={profileStatus.completionPercentage} className="h-2" />
              </div>
              <Button 
                size="sm" 
                className="mt-3"
                onClick={() => setLocation(profileRoute)}
                data-testid="button-complete-profile-banner"
              >
                Complete Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderClientDashboard = () => {
    if (clientStatsLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (clientStatsError || !clientStats) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Failed to Load Dashboard
              </CardTitle>
              <CardDescription>
                Unable to fetch your dashboard statistics. Please try refreshing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => refetchClientStats()} 
                className="w-full bg-primary text-primary-foreground"
                data-testid="button-retry-dashboard"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Client Dashboard</h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
            Manage your projects and find the right IT professionals
          </p>
        </div>

        {renderApprovalBanner(clientProfileStatus)}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-stat-active-jobs">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-jobs">
                {clientStats?.activeJobs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {clientStats?.activeJobs ? 'Currently open' : 'No active postings'}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-proposals">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proposals Received</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-proposals">
                {clientStats?.totalBids || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {clientStats?.totalBids ? 'Awaiting your review' : 'No proposals yet'}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-messages">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-messages">
                {clientStats?.messagesCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">No unread messages</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-spending">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-spending">
                ﷼ {parseFloat(clientStats?.totalSpending || "0").toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with posting your first job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start bg-primary text-primary-foreground" 
              onClick={() => setLocation('/post-job')}
              data-testid="button-post-job"
            >
              <Briefcase className="mr-2 h-4 w-4" />
              Post a New Job
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => setLocation('/browse-consultants')}
              data-testid="button-browse-vendors"
            >
              <Users className="mr-2 h-4 w-4" />
              Browse Vendors
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-view-messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              View Messages
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-project-history">
          <CardHeader>
            <CardTitle>Project History</CardTitle>
            <CardDescription>Your recent projects and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {!clientProjects || clientProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-projects">
                <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No projects yet</p>
                <p className="text-sm">Projects will appear here once a consultant is hired</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientProjects.slice(0, 5).map((project: any, index: number) => (
                  <div 
                    key={project.id} 
                    className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                    data-testid={`project-item-${index}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate" data-testid={`project-title-${index}`}>
                        {project.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={
                            project.status === 'completed' ? 'default' :
                            project.status === 'in_progress' ? 'secondary' :
                            project.status === 'cancelled' || project.status === 'disputed' ? 'destructive' :
                            'outline'
                          }
                          data-testid={`project-status-${index}`}
                        >
                          {project.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ﷼{parseFloat(project.budget || '0').toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="text-xs text-muted-foreground" data-testid={`project-date-${index}`}>
                        {project.completedAt 
                          ? `Completed ${new Date(project.completedAt).toLocaleDateString()}`
                          : project.startDate
                          ? `Started ${new Date(project.startDate).toLocaleDateString()}`
                          : `Created ${new Date(project.createdAt).toLocaleDateString()}`
                        }
                      </div>
                      {project.status === 'completed' && project.consultantId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReviewProject(project);
                            setReviewDialogOpen(true);
                          }}
                          data-testid={`button-leave-review-${index}`}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Leave Review
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {clientProjects.length > 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setLocation('/jobs')}
                    data-testid="button-view-all-projects"
                  >
                    View All Projects
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    );
  };

  const renderConsultantDashboard = () => {
    if (consultantStatsLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (consultantStatsError || !consultantStats) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Failed to Load Dashboard
              </CardTitle>
              <CardDescription>
                Unable to fetch your dashboard statistics. Please try refreshing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => refetchConsultantStats()} 
                className="w-full bg-primary text-primary-foreground"
                data-testid="button-retry-dashboard"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Consultant Dashboard</h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
            Find opportunities and manage your bids
          </p>
        </div>

        {renderApprovalBanner(consultantProfileStatus)}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-stat-available-jobs">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-available-jobs">
                {consultantStats?.availableJobs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {consultantStats?.availableJobs ? 'Matching your skills' : 'No jobs available'}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-active-bids">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bids</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-bids">
                {consultantStats?.activeBids || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {consultantStats?.activeBids ? 'Awaiting client review' : 'No active bids'}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-earnings">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-earnings">
                ﷼ {parseFloat(consultantStats?.totalEarnings || "0").toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-rating">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-rating">
                {parseFloat(consultantStats?.rating || "0").toFixed(1) || '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                {consultantStats && parseFloat(consultantStats.rating) > 0 ? 'Average rating' : 'No reviews yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        {!performanceScoreLoading && !performanceScoreError && performanceScore && (
          <Card data-testid="card-performance-score">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Overall Performance Score</CardTitle>
                  <CardDescription>Calculated from ratings, completion rate, and response time</CardDescription>
                </div>
                <div className="text-4xl font-bold text-primary" data-testid="text-performance-score">
                  {performanceScore.score.toFixed(0)}
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-32">Rating Score</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(performanceScore.breakdown.ratingScore / 40) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-right" data-testid="text-rating-score">
                    {performanceScore.breakdown.ratingScore.toFixed(0)}/40
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-32">Completion Score</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(performanceScore.breakdown.completionScore / 40) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-right" data-testid="text-completion-score">
                    {performanceScore.breakdown.completionScore.toFixed(0)}/40
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-32">Response Score</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(performanceScore.breakdown.responseScore / 20) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-right" data-testid="text-response-score">
                    {performanceScore.breakdown.responseScore.toFixed(0)}/20
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-quote-requests">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Incoming Quote Requests
                </CardTitle>
                <CardDescription>Respond to client quote requests for your service packages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!quoteRequests || quoteRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-quote-requests">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No quote requests yet</p>
                <p className="text-sm">Quote requests from clients will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quoteRequests.slice(0, 5).map((quote) => {
                  const truncatedDescription = quote.projectDescription.length > 100 
                    ? quote.projectDescription.substring(0, 100) + "..." 
                    : quote.projectDescription;
                  
                  return (
                    <div 
                      key={quote.id} 
                      className="flex flex-col gap-3 p-4 rounded-md border hover-elevate"
                      data-testid={`quote-request-${quote.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm" data-testid={`quote-package-${quote.id}`}>
                              {quote.packageName}
                            </h4>
                            <Badge 
                              variant={
                                quote.status === 'pending' ? 'secondary' :
                                quote.status === 'responded' ? 'default' :
                                'destructive'
                              }
                              className={
                                quote.status === 'pending' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-500' :
                                quote.status === 'responded' ? 'bg-green-500/10 text-green-700 dark:text-green-500' :
                                ''
                              }
                              data-testid={`quote-status-${quote.id}`}
                            >
                              {quote.status}
                            </Badge>
                          </div>
                          {quote.client && (
                            <p className="text-xs text-muted-foreground mb-1" data-testid={`quote-client-${quote.id}`}>
                              Client: {quote.client.fullName}
                              {quote.client.companyName && ` (${quote.client.companyName})`}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground" data-testid={`quote-description-${quote.id}`}>
                            {truncatedDescription}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground" data-testid={`quote-date-${quote.id}`}>
                          {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                        </span>
                        {quote.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setResponseDialogOpen(true);
                            }}
                            data-testid={`button-respond-quote-${quote.id}`}
                          >
                            Respond
                          </Button>
                        )}
                        {quote.status === 'responded' && quote.quotedAmount && (
                          <span className="text-sm font-medium text-primary" data-testid={`quote-amount-${quote.id}`}>
                            ﷼{parseFloat(quote.quotedAmount).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {quoteRequests.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Showing 5 of {quoteRequests.length} requests
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-performance-metrics">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Your work quality and completion stats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">Completion Rate</p>
                  <p className="text-xs text-muted-foreground">
                    {consultantMetrics?.completedProjects || 0} of {consultantMetrics?.totalProjects || 0} projects
                  </p>
                </div>
                <div className="text-2xl font-bold text-primary" data-testid="text-completion-rate">
                  {(consultantMetrics?.completionRate ?? 0).toFixed(0)}%
                </div>
              </div>

              {consultantReviewStats && consultantReviewStats.totalReviews > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Rating Breakdown</p>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = consultantReviewStats.ratingBreakdown[rating] || 0;
                    const percentage = consultantReviewStats.totalReviews > 0 ? (count / consultantReviewStats.totalReviews) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center gap-2" data-testid={`rating-breakdown-${rating}`}>
                        <span className="text-xs w-6">{rating}★</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Based on {consultantReviewStats.totalReviews} review{consultantReviewStats.totalReviews !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No reviews yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Find jobs and manage your work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start bg-primary text-primary-foreground" 
              onClick={() => setLocation('/browse-jobs')}
              data-testid="button-browse-jobs"
            >
              <Briefcase className="mr-2 h-4 w-4" />
              Browse Available Jobs
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-view-bids">
              <FileText className="mr-2 h-4 w-4" />
              View My Bids
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-edit-profile">
              <Users className="mr-2 h-4 w-4" />
              Edit Profile
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <CategoryRequestsList />

      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent data-testid="dialog-quote-response">
          <DialogHeader>
            <DialogTitle>Respond to Quote Request</DialogTitle>
            <DialogDescription>
              Provide your quote response for {selectedQuote?.packageName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client Request</Label>
                <p className="text-sm text-muted-foreground p-3 rounded-md border bg-muted/50" data-testid="text-quote-request-details">
                  {selectedQuote.projectDescription}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="response-message">
                  Response Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="response-message"
                  placeholder="Describe your proposal, timeline, and what's included..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={5}
                  data-testid="textarea-response-message"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoted-amount">
                  Quoted Amount (SAR) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ﷼
                  </span>
                  <Input
                    id="quoted-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={quotedAmount}
                    onChange={(e) => setQuotedAmount(e.target.value)}
                    className="pl-8"
                    data-testid="input-quoted-amount"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResponseDialogOpen(false);
                setSelectedQuote(null);
                setResponseMessage("");
                setQuotedAmount("");
              }}
              disabled={respondToQuoteMutation.isPending}
              data-testid="button-cancel-response"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedQuote || !responseMessage.trim() || !quotedAmount || parseFloat(quotedAmount) <= 0) {
                  toast({
                    title: "Validation Error",
                    description: "Please provide both a response message and a valid quoted amount.",
                    variant: "destructive"
                  });
                  return;
                }
                respondToQuoteMutation.mutate({
                  id: selectedQuote.id,
                  response: responseMessage,
                  amount: quotedAmount
                });
              }}
              disabled={respondToQuoteMutation.isPending || !responseMessage.trim() || !quotedAmount}
              data-testid="button-submit-response"
            >
              {respondToQuoteMutation.isPending ? "Sending..." : "Send Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    );
  };

  const renderDualRoleDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
          You have both client and consultant access
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover-elevate cursor-pointer" data-testid="card-switch-client">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Client Dashboard
            </CardTitle>
            <CardDescription>
              Post jobs and manage projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-primary text-primary-foreground" data-testid="button-view-client">
              View Client Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" data-testid="card-switch-consultant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Consultant Dashboard
            </CardTitle>
            <CardDescription>
              Find opportunities and submit bids
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-primary text-primary-foreground" data-testid="button-view-consultant">
              View Consultant Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <UserLayout>
      <div className="container mx-auto px-4 md:px-6 py-8">
        {user?.role === 'both' && renderDualRoleDashboard()}
        {selectedRole === 'client' && renderClientDashboard()}
        {selectedRole === 'consultant' && renderConsultantDashboard()}
        {!selectedRole && (
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Welcome to EDGEIT24!</h1>
            <p className="text-muted-foreground mb-6">Please complete your profile to get started</p>
            <Button className="bg-primary text-primary-foreground" data-testid="button-setup-profile">
              Set Up Profile
            </Button>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          {reviewProject && reviewProject.consultantId && (
            <ReviewForm
              projectId={reviewProject.id}
              consultantId={reviewProject.consultantId}
              consultantName={reviewProject.consultantName || "Consultant"}
              onSuccess={() => {
                setReviewDialogOpen(false);
                setReviewProject(null);
                queryClient.invalidateQueries({ queryKey: ['/api/projects/client'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
