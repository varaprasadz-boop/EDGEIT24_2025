import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Briefcase, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  budgetType: string;
  status: string;
  createdAt: string;
}

interface ProfileStatus {
  approvalStatus: 'pending' | 'approved' | 'rejected';
  profileStatus: 'draft' | 'submitted' | 'complete';
}

export default function MyJobs() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuthContext();

  // Fetch profile status (handle 403 gracefully - means no profile exists)
  const { data: profileStatus } = useQuery<ProfileStatus | null>({
    queryKey: ['/api/profile/status', 'client'],
    queryFn: async () => {
      const res = await fetch('/api/profile/status?role=client', { credentials: 'include' });
      if (res.status === 403) {
        // User doesn't have a client profile yet
        return null;
      }
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
      }
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Fetch user's jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs/my-jobs'],
    enabled: !!user && profileStatus?.approvalStatus === 'approved',
  });

  if (authLoading) {
    return (
      <UserLayout>
        <div className="container max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!user) {
    return (
      <UserLayout>
        <div className="container max-w-6xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Login Required</CardTitle>
              <CardDescription>Please log in to view your jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation('/login')}>Log In</Button>
            </CardContent>
          </Card>
        </div>
      </UserLayout>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Briefcase className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'open':
        return 'default';
      case 'closed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <UserLayout>
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-my-jobs-title">My Jobs</h1>
            <p className="text-muted-foreground" data-testid="text-my-jobs-subtitle">
              Manage all your job postings and track responses
            </p>
          </div>
          {/* Only show Post New Job button if profile is approved */}
          {profileStatus?.approvalStatus === 'approved' && (
            <Button
              onClick={() => setLocation('/post-job')}
              data-testid="button-post-new-job"
            >
              <Plus className="mr-2 h-4 w-4" />
              Post New Job
            </Button>
          )}
        </div>

        {/* Show message if no profile or profile not approved */}
        {(profileStatus === null || (profileStatus && profileStatus.approvalStatus !== 'approved')) && (
          <Card className="border-amber-500 bg-amber-500/5" data-testid="card-approval-pending">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Profile Approval Required
              </CardTitle>
              <CardDescription>
                You need an approved profile to view and manage your jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {!profileStatus
                  ? 'Create your client profile to start posting and managing jobs.'
                  : profileStatus.profileStatus === 'draft' 
                  ? 'Complete your profile and submit it for admin review to start posting jobs.'
                  : 'Your profile is currently under review. You\'ll be able to post and manage jobs once it\'s approved.'}
              </p>
              <Button
                onClick={() => setLocation(!profileStatus || profileStatus.profileStatus === 'draft' ? '/profile/client' : '/dashboard')}
                data-testid="button-go-to-profile"
              >
                {!profileStatus || profileStatus.profileStatus === 'draft' ? 'Complete Profile' : 'Go to Dashboard'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Show jobs list if approved */}
        {profileStatus?.approvalStatus === 'approved' && (
          <>
            {jobsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your jobs...</p>
              </div>
            ) : !jobs || jobs.length === 0 ? (
              <Card data-testid="card-no-jobs">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No jobs posted yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Start by posting your first job to connect with IT consultants
                  </p>
                  <Button onClick={() => setLocation('/post-job')} data-testid="button-post-first-job">
                    <Plus className="mr-2 h-4 w-4" />
                    Post Your First Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl mb-2" data-testid={`text-job-title-${job.id}`}>
                            {job.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2" data-testid={`text-job-description-${job.id}`}>
                            {job.description}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={getStatusVariant(job.status)}
                          className="flex items-center gap-1"
                          data-testid={`badge-job-status-${job.id}`}
                        >
                          {getStatusIcon(job.status)}
                          {job.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Budget:</span>
                          <span data-testid={`text-job-budget-${job.id}`}>
                            {job.budgetType === 'fixed' && job.budget
                              ? `﷼${parseFloat(job.budget).toFixed(2)}`
                              : 'Negotiable'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span data-testid={`text-job-created-${job.id}`}>
                            Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  );
}
