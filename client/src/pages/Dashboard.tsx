import { useAuthContext } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  AlertCircle
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, getActiveRole } = useAuthContext();
  const activeRole = getActiveRole();

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

  const renderClientDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Client Dashboard</h1>
        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
          Manage your projects and find the right IT professionals
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-active-jobs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-jobs">0</div>
            <p className="text-xs text-muted-foreground">No active postings</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-proposals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposals Received</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-proposals">0</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-messages">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-messages">0</div>
            <p className="text-xs text-muted-foreground">No unread messages</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-spending">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-spending">﷼ 0</div>
            <p className="text-xs text-muted-foreground">This month</p>
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
            <Button className="w-full justify-start bg-primary text-primary-foreground" data-testid="button-post-job">
              <Briefcase className="mr-2 h-4 w-4" />
              Post a New Job
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-browse-vendors">
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

        <Card data-testid="card-recent-activity">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-activity">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Post your first job to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderConsultantDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Consultant Dashboard</h1>
        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
          Find opportunities and manage your bids
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-available-jobs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-available-jobs">0</div>
            <p className="text-xs text-muted-foreground">Matching your skills</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-active-bids">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bids</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-bids">0</div>
            <p className="text-xs text-muted-foreground">Awaiting client review</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-earnings">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-earnings">﷼ 0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-rating">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-rating">-</div>
            <p className="text-xs text-muted-foreground">No reviews yet</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-profile-completion">
          <CardHeader>
            <CardTitle>Profile Completion</CardTitle>
            <CardDescription>Complete your profile to increase visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground" data-testid="text-profile-progress">20%</span>
              </div>
              <Progress value={20} className="h-2" data-testid="progress-profile" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Basic information added</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Add portfolio items</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Add skills and certifications</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Set hourly rates</span>
              </div>
            </div>
            <Button className="w-full bg-primary text-primary-foreground" data-testid="button-complete-profile">
              Complete Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Find jobs and manage your work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start bg-primary text-primary-foreground" data-testid="button-browse-jobs">
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
    </div>
  );

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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {activeRole === 'both' && renderDualRoleDashboard()}
        {activeRole === 'client' && renderClientDashboard()}
        {activeRole === 'consultant' && renderConsultantDashboard()}
        {!activeRole && (
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Welcome to EDGEIT24!</h1>
            <p className="text-muted-foreground mb-6">Please complete your profile to get started</p>
            <Button className="bg-primary text-primary-foreground" data-testid="button-setup-profile">
              Set Up Profile
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
