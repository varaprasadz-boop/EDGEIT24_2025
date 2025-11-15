import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertConsultantProfileSchema, insertPricingTemplateSchema, type ConsultantProfile, type PricingTemplate } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { Briefcase, MapPin, DollarSign, Star, AlertCircle, Edit, Save, X, Award, TrendingUp, Code, FolderOpen, Package, Calendar as CalendarIcon, Info, Tag, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";
import { useState as useReactState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CategorySelector } from "@/components/CategorySelector";
import { UserLayout } from "@/components/UserLayout";

const updateProfileSchema = insertConsultantProfileSchema.omit({
  userId: true,
  verified: true,
  rating: true,
  totalReviews: true,
  completedProjects: true,
}).extend({
  fullName: z.string().min(1, "Full name is required"),
});

type UpdateProfile = z.infer<typeof updateProfileSchema>;

interface PortfolioItem {
  title: string;
  description: string;
  url?: string;
}

interface ServicePackage {
  name: string;
  description: string;
  price: string;
  deliveryTime: string;
}

interface PricingTemplateForm {
  id?: string;
  name: string;
  description: string;
  basePrice: string;
  hourlyRate: string;
  estimatedHours: string;
}

type WeeklySchedule = {
  [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']?: ('morning' | 'afternoon' | 'evening')[];
};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const TIME_SLOTS = ['morning', 'afternoon', 'evening'] as const;
const WEEKDAY_LABELS: Record<typeof WEEKDAYS[number], string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun'
};
const TIME_SLOT_LABELS: Record<typeof TIME_SLOTS[number], string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening'
};

export default function ConsultantProfile() {
  const { user, isLoading: authLoading, getSelectedRole } = useAuthContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [portfolioItems, setPortfolioItems] = useReactState<PortfolioItem[]>([]);
  const [servicePackages, setServicePackages] = useReactState<ServicePackage[]>([]);
  const [pricingTemplates, setPricingTemplates] = useReactState<PricingTemplateForm[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useReactState<WeeklySchedule>({});
  const [selectedCategories, setSelectedCategories] = useReactState<string[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useReactState<string | null>(null);
  
  // Check if coming from onboarding
  const isOnboarding = new URLSearchParams(window.location.search).get('onboarding') === 'true';

  // Fetch consultant profile - treat 404 as "no profile yet" rather than error
  const { data: profile, isLoading, isError, refetch } = useQuery<ConsultantProfile | null>({
    queryKey: ['/api/profile/consultant'],
    queryFn: async () => {
      const response = await fetch('/api/profile/consultant', { 
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

  // Fetch pricing templates
  const { data: fetchedTemplates } = useQuery<PricingTemplate[]>({
    queryKey: ['/api/profile/consultant/pricing-templates'],
    enabled: !!profile,
    retry: false,
  });

  // Initialize pricing templates from API
  useEffect(() => {
    if (fetchedTemplates && !isEditing) {
      setPricingTemplates(fetchedTemplates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        basePrice: t.basePrice?.toString() || '',
        hourlyRate: t.hourlyRate?.toString() || '',
        estimatedHours: t.estimatedHours?.toString() || '',
      })));
    }
  }, [fetchedTemplates, isEditing]);

  // Create pricing template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<PricingTemplateForm, 'id'>) => {
      return apiRequest('POST', '/api/profile/consultant/pricing-templates', template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/consultant/pricing-templates'] });
      toast({
        title: "Template created",
        description: "Pricing template created successfully.",
      });
    },
  });

  // Update pricing template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PricingTemplateForm> }) => {
      return apiRequest('PUT', `/api/profile/consultant/pricing-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/consultant/pricing-templates'] });
      toast({
        title: "Template updated",
        description: "Pricing template updated successfully.",
      });
    },
  });

  // Delete pricing template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/profile/consultant/pricing-templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/consultant/pricing-templates'] });
      toast({
        title: "Template deleted",
        description: "Pricing template deleted successfully.",
      });
    },
  });

  // Reviews state and queries
  const [reviewsPage, setReviewsPage] = useState(0);
  const reviewsPerPage = 5;

  // Fetch reviews
  const { data: reviewsData } = useQuery<{ items: any[]; total: number }>({
    queryKey: ['/api/reviews', user?.id, reviewsPage],
    queryFn: async () => {
      if (!user?.id) return { items: [], total: 0 };
      const response = await fetch(`/api/reviews/${user.id}?limit=${reviewsPerPage}&offset=${reviewsPage * reviewsPerPage}`, {
        credentials: 'include'
      });
      if (!response.ok) return { items: [], total: 0 };
      return response.json();
    },
    enabled: !!user?.id && !isEditing,
  });
  
  const reviews = reviewsData?.items || [];
  const totalReviews = reviewsData?.total || 0;

  // Fetch review stats
  const { data: reviewStats } = useQuery<{ averageRating: number; totalReviews: number; ratingBreakdown: Record<number, number> }>({
    queryKey: ['/api/reviews', user?.id, 'stats'],
    queryFn: async () => {
      if (!user?.id) return { averageRating: 0, totalReviews: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      const response = await fetch(`/api/reviews/${user.id}/stats`, {
        credentials: 'include'
      });
      if (!response.ok) return { averageRating: 0, totalReviews: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      return response.json();
    },
    enabled: !!user?.id && !isEditing,
  });

  // Mark review helpful mutation
  const markHelpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest('POST', `/api/reviews/${reviewId}/helpful`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews', user?.id] });
    },
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

  // Reset form and initialize state when profile data loads
  useEffect(() => {
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
        weeklySchedule: profile.weeklySchedule ?? undefined,
        location: profile.location ?? undefined,
        timezone: profile.timezone ?? undefined,
        avatar: profile.avatar ?? undefined,
        responseTime: profile.responseTime ?? undefined,
      });
      
      // Initialize portfolio items from profile
      if (profile.portfolio && Array.isArray(profile.portfolio)) {
        setPortfolioItems(profile.portfolio as PortfolioItem[]);
      } else {
        setPortfolioItems([]);
      }
      
      // Initialize service packages from profile
      if (profile.servicePackages && Array.isArray(profile.servicePackages)) {
        setServicePackages(profile.servicePackages as ServicePackage[]);
      } else {
        setServicePackages([]);
      }
      
      // Initialize weekly schedule from profile
      if (profile.weeklySchedule && typeof profile.weeklySchedule === 'object') {
        setWeeklySchedule(profile.weeklySchedule as WeeklySchedule);
      } else {
        setWeeklySchedule({});
      }
    }
  }, [profile, isEditing, form]);

  // Auto-open edit mode when in onboarding flow
  useEffect(() => {
    if (isOnboarding && !isEditing && !isLoading) {
      setIsEditing(true);
    }
  }, [isOnboarding, isEditing, isLoading]);

  const toggleScheduleSlot = (day: typeof WEEKDAYS[number], slot: typeof TIME_SLOTS[number]) => {
    setWeeklySchedule(prev => {
      const daySlots = prev[day] || [];
      const updated = daySlots.includes(slot)
        ? daySlots.filter(s => s !== slot)
        : [...daySlots, slot];
      
      const newSchedule = {
        ...prev,
        [day]: updated.length > 0 ? updated : undefined
      };
      
      // Remove undefined values
      Object.keys(newSchedule).forEach(key => {
        if (newSchedule[key as typeof WEEKDAYS[number]] === undefined) {
          delete newSchedule[key as typeof WEEKDAYS[number]];
        }
      });
      
      form.setValue('weeklySchedule', Object.keys(newSchedule).length > 0 ? newSchedule as any : undefined);
      return newSchedule;
    });
  };

  const addPortfolioItem = () => {
    setPortfolioItems([...portfolioItems, { title: "", description: "" }]);
  };

  const updatePortfolioItem = (index: number, field: keyof PortfolioItem, value: string) => {
    const updated = [...portfolioItems];
    updated[index] = { ...updated[index], [field]: value };
    setPortfolioItems(updated);
    form.setValue('portfolio', updated as any);
  };

  const removePortfolioItem = (index: number) => {
    const updated = portfolioItems.filter((_, i) => i !== index);
    setPortfolioItems(updated);
    form.setValue('portfolio', updated.length > 0 ? updated as any : undefined);
  };

  const addServicePackage = () => {
    setServicePackages([...servicePackages, { name: "", description: "", price: "", deliveryTime: "" }]);
  };

  const updateServicePackage = (index: number, field: keyof ServicePackage, value: string) => {
    const updated = [...servicePackages];
    updated[index] = { ...updated[index], [field]: value };
    setServicePackages(updated);
    form.setValue('servicePackages', updated as any);
  };

  const removeServicePackage = (index: number) => {
    const updated = servicePackages.filter((_, i) => i !== index);
    setServicePackages(updated);
    form.setValue('servicePackages', updated.length > 0 ? updated as any : undefined);
  };

  // Pricing template management functions
  const addPricingTemplate = () => {
    setPricingTemplates([...pricingTemplates, { name: "", description: "", basePrice: "", hourlyRate: "", estimatedHours: "" }]);
  };

  const updatePricingTemplate = (index: number, field: keyof PricingTemplateForm, value: string) => {
    const updated = [...pricingTemplates];
    updated[index] = { ...updated[index], [field]: value };
    setPricingTemplates(updated);
  };

  const removePricingTemplate = async (index: number) => {
    const template = pricingTemplates[index];
    if (template.id) {
      try {
        await deleteTemplateMutation.mutateAsync(template.id);
        const updated = pricingTemplates.filter((_, i) => i !== index);
        setPricingTemplates(updated);
      } catch (error) {
        toast({
          title: "Delete failed",
          description: "Failed to delete pricing template",
          variant: "destructive",
        });
      }
    } else {
      const updated = pricingTemplates.filter((_, i) => i !== index);
      setPricingTemplates(updated);
    }
  };

  const savePricingTemplate = async (index: number) => {
    const template = pricingTemplates[index];
    if (!template.name || !template.basePrice) {
      toast({
        title: "Validation error",
        description: "Template name and base price are required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (template.id) {
        await updateTemplateMutation.mutateAsync({ id: template.id, data: template });
      } else {
        const created = await createTemplateMutation.mutateAsync(template);
        const updated = [...pricingTemplates];
        updated[index] = { ...template, id: (created as any).id };
        setPricingTemplates(updated);
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save pricing template",
        variant: "destructive",
      });
    }
  };

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

  // Fetch consultant categories
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/profile/consultant/categories'],
    enabled: !!user,
  });

  // Sync category state from query
  useEffect(() => {
    if (categoriesData && !isEditing) {
      const cats = categoriesData as any[];
      setSelectedCategories(cats.map((c: any) => c.categoryId));
      const primary = cats.find((c: any) => c.isPrimary);
      setPrimaryCategoryId(primary?.categoryId || null);
    }
  }, [categoriesData, isEditing]);

  // Save categories mutation
  const saveCategoriesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/profile/consultant/categories', {
        categoryIds: selectedCategories,
        primaryCategoryId,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save categories');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/consultant/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/consultant'] });
      toast({
        title: "Categories saved",
        description: "Your service categories have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save categories. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCategorySelectionChange = (categoryIds: string[], primaryId: string | null) => {
    setSelectedCategories(categoryIds);
    setPrimaryCategoryId(primaryId);
  };

  const handleSaveCategories = () => {
    saveCategoriesMutation.mutate();
  };

  const onSubmit = (data: UpdateProfile) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    if (isOnboarding) {
      setLocation('/dashboard');
    } else {
      form.reset();
      setIsEditing(false);
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
                <CardTitle>No Consultant Profile</CardTitle>
                <CardDescription>
                  You don't have a consultant profile yet. Create one to showcase your expertise and start receiving job opportunities.
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
                {isOnboarding && (
                  <Alert className="mb-6" data-testid="alert-onboarding">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Welcome! Complete your profile to showcase your expertise. You can skip this and update it later from your dashboard.
                    </AlertDescription>
                  </Alert>
                )}
                
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

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="React, Node.js, PostgreSQL, AWS (comma-separated)" 
                          value={field.value?.join(', ') ?? ""} 
                          onChange={(e) => {
                            const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                            field.onChange(skills.length > 0 ? skills : undefined);
                          }}
                          data-testid="input-skills" 
                        />
                      </FormControl>
                      <FormDescription>
                        Enter your technical skills separated by commas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        <FormLabel>Availability Status</FormLabel>
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

                <div>
                  <FormLabel className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="h-4 w-4" />
                    Weekly Availability Schedule
                  </FormLabel>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="text-left text-sm font-medium p-2 border-b"></th>
                              {TIME_SLOTS.map(slot => (
                                <th key={slot} className="text-center text-sm font-medium p-2 border-b" data-testid={`header-${slot}`}>
                                  {TIME_SLOT_LABELS[slot]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {WEEKDAYS.map(day => (
                              <tr key={day} className="border-b last:border-b-0">
                                <td className="text-sm font-medium p-2 w-24" data-testid={`label-${day}`}>
                                  {WEEKDAY_LABELS[day]}
                                </td>
                                {TIME_SLOTS.map(slot => (
                                  <td key={slot} className="text-center p-2">
                                    <Checkbox
                                      checked={(weeklySchedule[day] || []).includes(slot)}
                                      onCheckedChange={() => toggleScheduleSlot(day, slot)}
                                      data-testid={`checkbox-${day}-${slot}`}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        Select your available time slots for each day of the week.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <FormLabel>Portfolio Projects</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addPortfolioItem}
                      data-testid="button-add-portfolio"
                    >
                      Add Project
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {portfolioItems.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <Input
                                placeholder="Project title"
                                value={item.title}
                                onChange={(e) => updatePortfolioItem(index, 'title', e.target.value)}
                                data-testid={`input-portfolio-title-${index}`}
                              />
                              <Textarea
                                placeholder="Project description"
                                value={item.description}
                                onChange={(e) => updatePortfolioItem(index, 'description', e.target.value)}
                                className="min-h-[80px] resize-none"
                                data-testid={`input-portfolio-description-${index}`}
                              />
                              <Input
                                placeholder="Project URL (optional)"
                                value={item.url || ""}
                                onChange={(e) => updatePortfolioItem(index, 'url', e.target.value)}
                                data-testid={`input-portfolio-url-${index}`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePortfolioItem(index)}
                              data-testid={`button-remove-portfolio-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {portfolioItems.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No portfolio projects added yet. Click "Add Project" to showcase your work.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <FormLabel>Service Packages</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addServicePackage}
                      data-testid="button-add-service-package"
                    >
                      Add Package
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {servicePackages.map((pkg, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <Input
                                placeholder="Package name (e.g., Basic Website Setup)"
                                value={pkg.name}
                                onChange={(e) => updateServicePackage(index, 'name', e.target.value)}
                                data-testid={`input-package-name-${index}`}
                              />
                              <Textarea
                                placeholder="Package description"
                                value={pkg.description}
                                onChange={(e) => updateServicePackage(index, 'description', e.target.value)}
                                className="min-h-[80px] resize-none"
                                data-testid={`input-package-description-${index}`}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  type="number"
                                  placeholder="Price (﷼)"
                                  value={pkg.price}
                                  onChange={(e) => updateServicePackage(index, 'price', e.target.value)}
                                  data-testid={`input-package-price-${index}`}
                                />
                                <Input
                                  placeholder="Delivery time (e.g., 7 days)"
                                  value={pkg.deliveryTime}
                                  onChange={(e) => updateServicePackage(index, 'deliveryTime', e.target.value)}
                                  data-testid={`input-package-delivery-${index}`}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeServicePackage(index)}
                              data-testid={`button-remove-package-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {servicePackages.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No service packages added yet. Click "Add Package" to offer predefined services.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pricing Templates
                    </FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addPricingTemplate}
                      data-testid="button-add-pricing-template"
                    >
                      Add Template
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {pricingTemplates.map((template, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <Input
                                placeholder="Template name (e.g., Basic Website Development)"
                                value={template.name}
                                onChange={(e) => updatePricingTemplate(index, 'name', e.target.value)}
                                data-testid={`input-template-name-${index}`}
                              />
                              <Textarea
                                placeholder="Template description"
                                value={template.description}
                                onChange={(e) => updatePricingTemplate(index, 'description', e.target.value)}
                                className="min-h-[80px] resize-none"
                                data-testid={`input-template-description-${index}`}
                              />
                              <div className="grid grid-cols-3 gap-3">
                                <Input
                                  type="number"
                                  placeholder="Base Price (﷼)"
                                  value={template.basePrice}
                                  onChange={(e) => updatePricingTemplate(index, 'basePrice', e.target.value)}
                                  data-testid={`input-template-baseprice-${index}`}
                                />
                                <Input
                                  type="number"
                                  placeholder="Hourly Rate (﷼)"
                                  value={template.hourlyRate}
                                  onChange={(e) => updatePricingTemplate(index, 'hourlyRate', e.target.value)}
                                  data-testid={`input-template-hourlyrate-${index}`}
                                />
                                <Input
                                  type="number"
                                  placeholder="Est. Hours"
                                  value={template.estimatedHours}
                                  onChange={(e) => updatePricingTemplate(index, 'estimatedHours', e.target.value)}
                                  data-testid={`input-template-hours-${index}`}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  onClick={() => savePricingTemplate(index)}
                                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                                  data-testid={`button-save-template-${index}`}
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  {template.id ? 'Update' : 'Save'}
                                </Button>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePricingTemplate(index)}
                              data-testid={`button-remove-template-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {pricingTemplates.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No pricing templates added yet. Click "Add Template" to create reusable pricing structures.
                      </div>
                    )}
                  </div>
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
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  <Code className="h-4 w-4 inline mr-1" />
                  Skills
                </div>
                <div className="flex flex-wrap gap-2" data-testid="text-skills">
                  {profile?.skills && profile.skills.length > 0 ? (
                    profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No skills listed</span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  <ShieldCheck className="h-4 w-4 inline mr-1" />
                  Verification Status
                </div>
                <div className="flex flex-wrap gap-2" data-testid="verification-badges">
                  <VerificationBadge 
                    type="email" 
                    verified={user?.emailVerified || false} 
                  />
                  <VerificationBadge 
                    type="phone" 
                    verified={false}
                  />
                  <VerificationBadge 
                    type="identity" 
                    verified={false}
                  />
                  <VerificationBadge 
                    type="business" 
                    verified={profile?.verified || false} 
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Complete verification steps to build trust with clients
                </p>
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

          {/* Service Categories Card - View Mode */}
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Service Categories
                </CardTitle>
                <CardDescription>
                  Select up to 10 service categories that describe your expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategorySelector
                  selectedCategories={selectedCategories}
                  primaryCategoryId={primaryCategoryId}
                  onSelectionChange={handleCategorySelectionChange}
                  maxSelections={10}
                />
                {isOnboarding && selectedCategories.length === 0 && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Please select at least one service category to continue
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <div className="px-6 pb-6">
                <Button
                  onClick={handleSaveCategories}
                  disabled={saveCategoriesMutation.isPending || (selectedCategories.length > 0 && !primaryCategoryId)}
                  className="w-full"
                  data-testid="button-save-categories"
                >
                  {saveCategoriesMutation.isPending ? "Saving..." : "Save Categories"}
                </Button>
              </div>
            </Card>
          ) : categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Service Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(categoriesData as any[]).map((cat: any) => (
                    <Badge
                      key={cat.id}
                      variant={cat.isPrimary ? "default" : "secondary"}
                      className="text-sm py-1 px-3"
                      data-testid={`badge-category-${cat.categoryId}`}
                    >
                      {cat.isPrimary && <Star className="h-3 w-3 mr-1 fill-current" />}
                      {cat.category.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {profile?.portfolio && Array.isArray(profile.portfolio) && profile.portfolio.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  Portfolio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(profile.portfolio as PortfolioItem[]).map((item, index) => (
                  <div key={index} className="border-l-2 border-primary pl-4" data-testid={`portfolio-item-${index}`}>
                    <h4 className="font-semibold" data-testid={`text-portfolio-title-${index}`}>{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-portfolio-description-${index}`}>
                      {item.description}
                    </p>
                    {item.url && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-primary hover:underline mt-2 inline-block"
                        data-testid={`link-portfolio-url-${index}`}
                      >
                        View Project →
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {profile?.servicePackages && Array.isArray(profile.servicePackages) && profile.servicePackages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Service Packages
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(profile.servicePackages as ServicePackage[]).map((pkg, index) => (
                  <Card key={index} data-testid={`service-package-${index}`}>
                    <CardHeader>
                      <CardTitle className="text-lg" data-testid={`text-package-name-${index}`}>{pkg.name}</CardTitle>
                      <CardDescription data-testid={`text-package-description-${index}`}>{pkg.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-primary" data-testid={`text-package-price-${index}`}>
                          ﷼{parseFloat(pkg.price).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-package-delivery-${index}`}>
                          {pkg.deliveryTime}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {pricingTemplates && pricingTemplates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Pricing Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pricingTemplates.map((template, index) => (
                  <Card key={index} data-testid={`pricing-template-${index}`}>
                    <CardHeader>
                      <CardTitle className="text-lg" data-testid={`text-template-name-${index}`}>{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription data-testid={`text-template-description-${index}`}>
                          {template.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Base Price</span>
                        <span className="text-xl font-bold text-primary" data-testid={`text-template-baseprice-${index}`}>
                          ﷼{parseFloat(template.basePrice || '0').toFixed(2)}
                        </span>
                      </div>
                      {template.hourlyRate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Hourly Rate</span>
                          <span className="text-sm font-medium" data-testid={`text-template-hourlyrate-${index}`}>
                            ﷼{parseFloat(template.hourlyRate).toFixed(2)}/hr
                          </span>
                        </div>
                      )}
                      {template.estimatedHours && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Est. Hours</span>
                          <span className="text-sm font-medium" data-testid={`text-template-hours-${index}`}>
                            {template.estimatedHours} hours
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {reviewStats && reviewStats.totalReviews > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Reviews & Ratings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold" data-testid="text-average-rating">
                      {reviewStats.averageRating.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center gap-1 my-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${star <= Math.round(reviewStats.averageRating) ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid="text-total-reviews">
                      Based on {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviewStats.ratingBreakdown[rating] || 0;
                      const percentage = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-2" data-testid={`rating-breakdown-${rating}`}>
                          <span className="text-sm w-8">{rating}★</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {reviews && reviews.length > 0 && (
                  <div className="space-y-4 border-t pt-6">
                    <h4 className="font-semibold">Recent Reviews</h4>
                    {reviews.map((review: any, index: number) => (
                      <Card key={review.id} data-testid={`review-${index}`}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground" data-testid={`review-date-${index}`}>
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {review.comment && (
                            <p className="text-sm" data-testid={`review-comment-${index}`}>
                              {review.comment}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markHelpfulMutation.mutate(review.id)}
                              disabled={markHelpfulMutation.isPending}
                              data-testid={`button-helpful-${index}`}
                            >
                              👍 Helpful ({review.helpful || 0})
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {totalReviews > reviewsPerPage && (
                      <div className="flex gap-2 justify-center pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewsPage(prev => Math.max(0, prev - 1))}
                          disabled={reviewsPage === 0}
                          data-testid="button-reviews-prev"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground self-center">
                          Page {reviewsPage + 1} of {Math.ceil(totalReviews / reviewsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewsPage(prev => prev + 1)}
                          disabled={(reviewsPage + 1) * reviewsPerPage >= totalReviews}
                          data-testid="button-reviews-next"
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profile?.weeklySchedule && Object.keys(profile.weeklySchedule).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Weekly Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {WEEKDAYS.map(day => {
                    const schedule = profile.weeklySchedule as WeeklySchedule;
                    const slots = schedule[day];
                    if (!slots || slots.length === 0) return null;
                    
                    return (
                      <div key={day} className="flex items-start gap-2" data-testid={`schedule-${day}`}>
                        <span className="font-medium text-sm min-w-[60px]">{WEEKDAY_LABELS[day]}:</span>
                        <div className="flex flex-wrap gap-1">
                          {slots.map(slot => (
                            <Badge key={slot} variant="secondary" className="text-xs">
                              {TIME_SLOT_LABELS[slot]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      </div>
    </UserLayout>
  );
}
