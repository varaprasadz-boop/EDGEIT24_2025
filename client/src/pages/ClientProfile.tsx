import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientProfileSchema, type ClientProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Building2, Globe, MapPin, AlertCircle, Edit, Save, X, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";
import { UserLayout } from "@/components/UserLayout";
import { Link } from "wouter";

const updateProfileSchema = insertClientProfileSchema.omit({
  userId: true,
});

type UpdateProfile = z.infer<typeof updateProfileSchema>;

export default function ClientProfile() {
  const { user, isLoading: authLoading, getSelectedRole } = useAuthContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Check if coming from onboarding
  const isOnboarding = new URLSearchParams(window.location.search).get('onboarding') === 'true';

  // Fetch client profile - treat 404 as "no profile yet" rather than error
  const { data: profile, isLoading, isError, refetch } = useQuery<ClientProfile | null>({
    queryKey: ['/api/profile/client'],
    queryFn: async () => {
      const response = await fetch('/api/profile/client', { 
        credentials: 'include' 
      });
      if (response.status === 404) {
        // No profile exists yet - return null instead of throwing
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Form setup
  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      companyName: profile?.companyName ?? undefined,
      industry: profile?.industry ?? undefined,
      companySize: profile?.companySize ?? undefined,
      website: profile?.website ?? undefined,
      description: profile?.description ?? undefined,
      location: profile?.location ?? undefined,
      avatar: profile?.avatar ?? undefined,
    },
  });

  // Auto-open edit mode if onboarding
  useEffect(() => {
    if (isOnboarding && !isEditing && !isLoading) {
      setIsEditing(true);
    }
  }, [isOnboarding, isEditing, isLoading]);

  // Reset form when profile data loads
  useEffect(() => {
    if (profile && !isEditing) {
      form.reset({
        companyName: profile.companyName ?? undefined,
        industry: profile.industry ?? undefined,
        companySize: profile.companySize ?? undefined,
        website: profile.website ?? undefined,
        description: profile.description ?? undefined,
        location: profile.location ?? undefined,
        avatar: profile.avatar ?? undefined,
      });
    }
  }, [profile, isEditing, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      return await apiRequest('PUT', '/api/profile/client', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/client'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your client profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateProfile) => {
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms & Conditions to continue.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
    setTermsAccepted(false);
    if (isOnboarding) {
      setLocation('/dashboard');
    }
  };

  const handleSkip = () => {
    setLocation('/dashboard');
  };

  if (authLoading || isLoading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </UserLayout>
    );
  }

  if (isError) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Failed to Load Profile
              </CardTitle>
              <CardDescription>
                Unable to fetch your profile information. Please try refreshing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => refetch()}
                className="w-full bg-primary text-primary-foreground"
                data-testid="button-retry-profile"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </UserLayout>
    );
  }

  // Show Create Profile button when no profile exists (and not in edit mode)
  if (!profile && !isLoading && !isError && !isEditing) {
    return (
      <UserLayout>
        <div className="container max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-[600px]">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>No Client Profile</CardTitle>
                <CardDescription>
                  You don't have a client profile yet. Create one to start posting requirements and receiving bids.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full"
                  data-testid="button-create-profile"
                >
                  Create Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-profile-title">Client Profile</h1>
            <p className="text-muted-foreground">Manage your company information and preferences</p>
          </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="default"
            data-testid="button-edit-profile"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile Information</CardTitle>
            <CardDescription>Update your company details and business information</CardDescription>
          </CardHeader>
          <CardContent>
            {isOnboarding && (
              <Alert className="mb-6" data-testid="alert-onboarding">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Welcome! Complete your profile to get started. You can always skip this and update it later from your dashboard.
                </AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} value={field.value ?? ""} data-testid="input-company-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input placeholder="Technology, Finance, Healthcare, etc." {...field} value={field.value ?? ""} data-testid="input-industry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-company-size">
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="small">Small (1-50 employees)</SelectItem>
                          <SelectItem value="medium">Medium (51-200 employees)</SelectItem>
                          <SelectItem value="large">Large (201-1000 employees)</SelectItem>
                          <SelectItem value="enterprise">Enterprise (1000+ employees)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.example.com" {...field} value={field.value ?? ""} data-testid="input-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Riyadh, Saudi Arabia" {...field} value={field.value ?? ""} data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your company..."
                          className="min-h-[120px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description of your company and what services you're looking for.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2 pt-2" data-testid="container-terms-checkbox">
                  <Checkbox
                    id="terms-client"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    data-testid="checkbox-terms-acceptance"
                  />
                  <label
                    htmlFor="terms-client"
                    className="text-sm text-muted-foreground cursor-pointer"
                    data-testid="label-terms-acceptance"
                  >
                    I agree to the{" "}
                    <Link href="/legal/terms-and-conditions" className="text-primary hover:underline" data-testid="link-terms">
                      Terms & Conditions
                    </Link>
                  </label>
                </div>

                <div className="flex gap-3 justify-end">
                  {isOnboarding && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSkip}
                      disabled={updateMutation.isPending}
                      data-testid="button-skip-onboarding"
                    >
                      Skip for Now
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateMutation.isPending}
                    data-testid="button-cancel-edit"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Company Name</div>
                <div className="font-medium" data-testid="text-company-name">
                  {profile?.companyName || "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Industry</div>
                <div className="font-medium" data-testid="text-industry">
                  {profile?.industry || "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Company Size</div>
                <div className="font-medium capitalize" data-testid="text-company-size">
                  {profile?.companySize ? profile.companySize.replace('_', ' ') : "Not provided"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Website</div>
                <div className="font-medium" data-testid="text-website">
                  {profile?.website ? (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {profile.website}
                    </a>
                  ) : (
                    "Not provided"
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </div>
                <div className="font-medium" data-testid="text-location">
                  {profile?.location || "Not provided"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Company</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap" data-testid="text-description">
                {profile?.description || "No description provided"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </UserLayout>
  );
}
