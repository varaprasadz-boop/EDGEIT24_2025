import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertConsultantProfileSchema, type ConsultantProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, DollarSign, Star, AlertCircle, Edit, Save, X, Award, TrendingUp } from "lucide-react";
import { z } from "zod";

const updateProfileSchema = insertConsultantProfileSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  verified: true,
  rating: true,
  totalReviews: true,
  completedProjects: true,
}).extend({
  fullName: z.string().min(1, "Full name is required"),
});

type UpdateProfile = z.infer<typeof updateProfileSchema>;

export default function ConsultantProfile() {
  const { user, isLoading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch consultant profile
  const { data: profile, isLoading, isError, refetch } = useQuery<ConsultantProfile>({
    queryKey: ['/api/profile/consultant'],
    queryFn: async () => {
      const response = await fetch('/api/profile/consultant', { 
        credentials: 'include' 
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user?.consultantProfile,
    retry: false,
  });

  // Form setup
  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? "",
      title: profile?.title ?? undefined,
      bio: profile?.bio ?? undefined,
      skills: profile?.skills ?? undefined,
      hourlyRate: profile?.hourlyRate ?? undefined,
      experience: profile?.experience ?? undefined,
      portfolio: profile?.portfolio ?? undefined,
      certifications: profile?.certifications ?? undefined,
      languages: profile?.languages ?? undefined,
      availability: profile?.availability ?? undefined,
      location: profile?.location ?? undefined,
      timezone: profile?.timezone ?? undefined,
      avatar: profile?.avatar ?? undefined,
      responseTime: profile?.responseTime ?? undefined,
    },
  });

  // Reset form when profile data loads
  if (profile && !isEditing) {
    form.reset({
      fullName: profile.fullName ?? "",
      title: profile.title ?? undefined,
      bio: profile.bio ?? undefined,
      skills: profile.skills ?? undefined,
      hourlyRate: profile.hourlyRate ?? undefined,
      experience: profile.experience ?? undefined,
      portfolio: profile.portfolio ?? undefined,
      certifications: profile.certifications ?? undefined,
      languages: profile.languages ?? undefined,
      availability: profile.availability ?? undefined,
      location: profile.location ?? undefined,
      timezone: profile.timezone ?? undefined,
      avatar: profile.avatar ?? undefined,
      responseTime: profile.responseTime ?? undefined,
    });
  }

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      return await apiRequest('PUT', '/api/profile/consultant', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/consultant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your consultant profile has been updated successfully.",
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
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
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
    );
  }

  if (!user?.consultantProfile) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Consultant Profile</CardTitle>
            <CardDescription>
              You don't have a consultant profile yet. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-profile-title">Consultant Profile</h1>
          <p className="text-muted-foreground">Manage your professional information and showcase your expertise</p>
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
            <CardDescription>Update your professional details and skills</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-fullname" />
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
                      <FormLabel>Professional Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Senior Full-Stack Developer" {...field} value={field.value ?? ""} data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell clients about yourself and your expertise..."
                          className="min-h-[120px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        A brief introduction highlighting your skills and experience.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate (﷼)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="150.00" 
                            {...field} 
                            value={field.value ?? ""} 
                            data-testid="input-hourly-rate" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-experience">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="junior">Junior</SelectItem>
                            <SelectItem value="mid">Mid-Level</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    name="availability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Availability</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-availability">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="busy">Busy</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3 justify-end">
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
                <Briefcase className="h-5 w-5 text-primary" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Full Name</div>
                <div className="font-medium" data-testid="text-fullname">
                  {profile?.fullName || "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Title</div>
                <div className="font-medium" data-testid="text-title">
                  {profile?.title || "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Experience Level</div>
                <div className="font-medium capitalize" data-testid="text-experience">
                  {profile?.experience || "Not provided"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Pricing & Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Hourly Rate</div>
                <div className="font-medium" data-testid="text-hourly-rate">
                  {profile?.hourlyRate ? `﷼${parseFloat(profile.hourlyRate).toFixed(2)}/hour` : "Not set"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Availability Status</div>
                <Badge 
                  variant={profile?.availability === 'available' ? 'default' : 'secondary'}
                  data-testid="badge-availability"
                >
                  {profile?.availability ? profile.availability.charAt(0).toUpperCase() + profile.availability.slice(1) : "Not set"}
                </Badge>
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
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <div className="text-2xl font-bold" data-testid="text-rating">
                    {profile?.rating ? parseFloat(profile.rating).toFixed(1) : "0.0"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-total-reviews">
                  {profile?.totalReviews || 0}
                </div>
                <div className="text-xs text-muted-foreground">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-completed-projects">
                  {profile?.completedProjects || 0}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap" data-testid="text-bio">
                {profile?.bio || "No bio provided"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
