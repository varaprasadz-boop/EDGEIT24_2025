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
import { Label } from "@/components/ui/label";
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

  // Form setup - pre-fill with registration data if creating new profile
  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      companyName: profile?.companyName ?? user?.companyName ?? undefined,
      contactEmail: profile?.contactEmail ?? user?.email ?? undefined,
      contactPhone: profile?.contactPhone ?? user?.phone ?? undefined,
      phoneCountryCode: profile?.phoneCountryCode ?? user?.phoneCountryCode ?? undefined,
      businessType: profile?.businessType ?? undefined,
      industry: profile?.industry ?? undefined,
      region: profile?.region ?? undefined,
      companySize: profile?.companySize ?? undefined,
      website: profile?.website ?? undefined,
      description: profile?.description ?? undefined,
      location: profile?.location ?? undefined,
      avatar: profile?.avatar ?? undefined,
    },
  });

  // Auto-open edit mode if onboarding or creating new profile
  useEffect(() => {
    if ((isOnboarding || !profile) && !isEditing && !isLoading) {
      setIsEditing(true);
    }
  }, [isOnboarding, profile, isEditing, isLoading]);

  // Reset form when profile data loads or when creating new profile from user data
  useEffect(() => {
    if (profile && !isEditing) {
      // Existing profile - use profile data
      form.reset({
        companyName: profile.companyName ?? undefined,
        contactEmail: profile.contactEmail ?? undefined,
        contactPhone: profile.contactPhone ?? undefined,
        phoneCountryCode: profile.phoneCountryCode ?? undefined,
        businessType: profile.businessType ?? undefined,
        industry: profile.industry ?? undefined,
        region: profile.region ?? undefined,
        companySize: profile.companySize ?? undefined,
        website: profile.website ?? undefined,
        description: profile.description ?? undefined,
        location: profile.location ?? undefined,
        avatar: profile.avatar ?? undefined,
      });
    } else if (!profile && user && isEditing) {
      // New profile - pre-fill with registration data
      form.reset({
        companyName: user.companyName ?? undefined,
        contactEmail: user.email ?? undefined,
        contactPhone: user.phone ?? undefined,
        phoneCountryCode: user.phoneCountryCode ?? undefined,
        businessType: undefined,
        industry: undefined,
        region: undefined,
        companySize: undefined,
        website: undefined,
        description: undefined,
        location: undefined,
        avatar: undefined,
      });
    }
  }, [profile, user, isEditing, form]);

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
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="contact@company.com" 
                          {...field} 
                          value={field.value ?? ""} 
                          data-testid="input-contact-email" 
                        />
                      </FormControl>
                      <FormDescription>Business contact email</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phoneCountryCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Country Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+966" 
                            {...field} 
                            value={field.value ?? ""} 
                            data-testid="input-phone-country-code" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="501234567" 
                            {...field} 
                            value={field.value ?? ""} 
                            data-testid="input-contact-phone" 
                          />
                        </FormControl>
                        <FormDescription>Business contact number</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-business-type">
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="finance">Finance & Banking</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="retail">Retail & E-commerce</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="real_estate">Real Estate</SelectItem>
                          <SelectItem value="construction">Construction</SelectItem>
                          <SelectItem value="hospitality">Hospitality & Tourism</SelectItem>
                          <SelectItem value="telecommunications">Telecommunications</SelectItem>
                          <SelectItem value="energy">Energy & Utilities</SelectItem>
                          <SelectItem value="transportation">Transportation & Logistics</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="nonprofit">Non-Profit</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="riyadh">Riyadh Region</SelectItem>
                          <SelectItem value="makkah">Makkah Region</SelectItem>
                          <SelectItem value="madinah">Madinah Region</SelectItem>
                          <SelectItem value="eastern">Eastern Province</SelectItem>
                          <SelectItem value="asir">Asir Region</SelectItem>
                          <SelectItem value="tabuk">Tabuk Region</SelectItem>
                          <SelectItem value="hail">Hail Region</SelectItem>
                          <SelectItem value="northern_borders">Northern Borders</SelectItem>
                          <SelectItem value="jazan">Jazan Region</SelectItem>
                          <SelectItem value="najran">Najran Region</SelectItem>
                          <SelectItem value="al_bahah">Al Bahah Region</SelectItem>
                          <SelectItem value="al_jawf">Al Jawf Region</SelectItem>
                          <SelectItem value="qassim">Qassim Region</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="500+">500+ employees</SelectItem>
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
                <div className="text-sm text-muted-foreground mb-1">Business Type</div>
                <div className="font-medium capitalize" data-testid="text-business-type">
                  {profile?.businessType || "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Industry</div>
                <div className="font-medium capitalize" data-testid="text-industry">
                  {profile?.industry ? profile.industry.replace(/_/g, ' ') : "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Region</div>
                <div className="font-medium capitalize" data-testid="text-region">
                  {profile?.region ? profile.region.replace(/_/g, ' ') : "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Company Size</div>
                <div className="font-medium" data-testid="text-company-size">
                  {profile?.companySize ? profile.companySize.replace(/-/g, ' to ').replace('+', ' or more') : "Not provided"}
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
