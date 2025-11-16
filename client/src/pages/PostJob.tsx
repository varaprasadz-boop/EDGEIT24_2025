import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CascadingCategorySelector } from "@/components/CascadingCategorySelector";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Briefcase, ArrowLeft, UserCircle, Clock, AlertCircle, Users } from "lucide-react";
import { insertJobSchema } from "@shared/schema";
import { useAuthContext } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

// Extend schema with validation
const postJobSchema = insertJobSchema.extend({
  categoryId: z.string().min(1, "Please select a service category"),
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
});

type PostJobFormData = z.infer<typeof postJobSchema>;

interface ProfileStatus {
  role: 'client' | 'consultant';
  profileStatus: 'draft' | 'submitted' | 'complete';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  uniqueId: string | null;
  adminNotes: string | null;
  completionPercentage: number;
}

export default function PostJob() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [categoryPath, setCategoryPath] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { user, isLoading, getActiveRole } = useAuthContext();

  // Check if user has client role (safely after user is loaded)
  const activeRole = user ? getActiveRole() : null;
  const isClient = activeRole === 'client' || activeRole === 'both';

  // Fetch client profile status (handle 403 gracefully - means no profile exists)
  const { data: profileStatus, isLoading: profileLoading } = useQuery<ProfileStatus | null>({
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
    enabled: !!user && isClient,
    retry: false, // Don't retry on 403
  });

  const form = useForm<PostJobFormData>({
    resolver: zodResolver(postJobSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      budgetType: "negotiable",
      budget: undefined,
      status: "open",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: PostJobFormData) => {
      const response = await apiRequest('POST', '/api/jobs', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to post job');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Job posted successfully",
        description: "Your job has been published and is now visible to consultants.",
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PostJobFormData) => {
    // Guard against submission if not client
    if (!isClient) {
      toast({
        title: "Authorization Required",
        description: "You must have a client profile to post jobs.",
        variant: "destructive",
      });
      return;
    }
    // Check if terms are accepted
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms & Conditions to continue.",
        variant: "destructive",
      });
      return;
    }
    createJobMutation.mutate(data);
  };

  // Show loading state
  if (isLoading || profileLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              You must be logged in to post a job.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please log in with your client account to post jobs and connect with IT consultants.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => setLocation(`/login?redirect=${encodeURIComponent('/post-job')}`)}
                data-testid="button-login"
              >
                Log In
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/register')}
                data-testid="button-register"
              >
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if user is not a client
  if (!isClient) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Profile Required</CardTitle>
            <CardDescription>
              You need to create a client profile before posting jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As a client, you can post jobs, review bids from consultants, and manage your projects.
            </p>
            <Button onClick={() => setLocation('/profile/client')} data-testid="button-create-profile">
              Create Client Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No profile exists (403 from API) - show create profile message
  if (profileStatus === null) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Profile Required</CardTitle>
            <CardDescription>
              You need to create a client profile before posting jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create your client profile to start posting jobs and connecting with IT consultants.
            </p>
            <Button onClick={() => setLocation('/profile/client')} data-testid="button-create-profile">
              Create Client Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check profile status and show appropriate message
  if (profileStatus) {
    // Profile is incomplete - needs completion
    if (profileStatus.profileStatus === 'draft' && profileStatus.completionPercentage < 100) {
      return (
        <div className="container max-w-4xl mx-auto p-6 space-y-6">
          <Card className="border-blue-500 bg-blue-500/5" data-testid="card-profile-incomplete">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-blue-600" />
                Complete Your Profile
              </CardTitle>
              <CardDescription>
                You need to complete your client profile before posting jobs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profile completion</span>
                  <span className="font-medium">{profileStatus.completionPercentage}%</span>
                </div>
                <Progress value={profileStatus.completionPercentage} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">
                Complete all required fields in your profile, then submit it for admin approval.
              </p>
              <Button 
                onClick={() => setLocation('/profile/client')} 
                data-testid="button-complete-profile"
              >
                Complete Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Profile is pending approval
    if (profileStatus.approvalStatus === 'pending' && profileStatus.profileStatus === 'submitted') {
      return (
        <div className="container max-w-4xl mx-auto p-6 space-y-6">
          <Card className="border-amber-500 bg-amber-500/5" data-testid="card-profile-pending">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Profile Under Review
              </CardTitle>
              <CardDescription>
                Your profile is being reviewed by our admin team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your profile has been submitted for review. You'll be able to post jobs once it's approved. 
                Meanwhile, you can browse consultants and suppliers.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setLocation('/browse-consultants')} 
                  data-testid="button-browse-consultants"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Browse Consultants
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/dashboard')} 
                  data-testid="button-dashboard"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Profile was rejected
    if (profileStatus.approvalStatus === 'rejected') {
      return (
        <div className="container max-w-4xl mx-auto p-6 space-y-6">
          <Card className="border-destructive bg-destructive/5" data-testid="card-profile-rejected">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Profile Rejected
              </CardTitle>
              <CardDescription>
                Your profile needs updates before you can post jobs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileStatus.adminNotes && (
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-sm font-medium mb-1">Admin feedback:</p>
                  <p className="text-sm text-muted-foreground">{profileStatus.adminNotes}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Please update your profile based on the admin feedback and resubmit for approval.
              </p>
              <Button 
                onClick={() => setLocation('/profile/client')} 
                data-testid="button-update-profile"
              >
                Update & Resubmit Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Profile exists but not approved - catch any other states
    if (profileStatus.approvalStatus !== 'approved') {
      return (
        <div className="container max-w-4xl mx-auto p-6 space-y-6">
          <Card className="border-amber-500 bg-amber-500/5" data-testid="card-profile-not-approved">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Profile Approval Required
              </CardTitle>
              <CardDescription>
                Your profile needs to be approved before posting jobs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please complete and submit your profile for admin approval.
              </p>
              <Button onClick={() => setLocation('/profile/client')} data-testid="button-view-profile">
                View Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Only render job posting form if profile is approved
  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/dashboard')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Post a New Job</h1>
          <p className="text-muted-foreground">
            Describe your project and find the right consultant
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Job Details
              </CardTitle>
              <CardDescription>
                Provide clear information about your project requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Category</FormLabel>
                    <FormControl>
                      <CascadingCategorySelector
                        value={field.value}
                        onChange={(categoryId, path) => {
                          field.onChange(categoryId);
                          if (path) setCategoryPath(path);
                        }}
                        disabled={createJobMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Build a responsive e-commerce website"
                        disabled={createJobMutation.isPending}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormDescription>
                      A clear, descriptive title for your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe your project requirements, goals, and expectations..."
                        rows={6}
                        disabled={createJobMutation.isPending}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Provide detailed information to help consultants understand your needs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="budgetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                        disabled={createJobMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-budget-type">
                            <SelectValue placeholder="Select budget type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Price</SelectItem>
                          <SelectItem value="hourly">Hourly Rate</SelectItem>
                          <SelectItem value="negotiable">Negotiable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (SAR)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="number"
                          placeholder="e.g., 5000"
                          disabled={createJobMutation.isPending}
                          data-testid="input-budget"
                        />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center space-x-2 pt-2 pb-4" data-testid="container-terms-checkbox">
            <Checkbox
              id="terms-job"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              data-testid="checkbox-terms-acceptance"
            />
            <label
              htmlFor="terms-job"
              className="text-sm text-muted-foreground cursor-pointer"
              data-testid="label-terms-acceptance"
            >
              I agree to the{" "}
              <Link href="/legal/terms-and-conditions" className="text-primary hover:underline" data-testid="link-terms">
                Terms & Conditions
              </Link>
            </label>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/dashboard')}
              disabled={createJobMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createJobMutation.isPending || !isClient}
              data-testid="button-submit"
            >
              {createJobMutation.isPending ? "Posting..." : "Post Job"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
