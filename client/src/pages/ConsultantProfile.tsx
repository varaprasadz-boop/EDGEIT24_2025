import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertConsultantProfileSchema, insertPricingTemplateSchema, type ConsultantProfile, type PricingTemplate, type Language, LANGUAGE_PROFICIENCIES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { Briefcase, MapPin, DollarSign, Star, AlertCircle, Edit, Save, X, Award, TrendingUp, Code, FolderOpen, Package, Calendar as CalendarIcon, Info, Tag, ShieldCheck, Building2 } from "lucide-react";
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
  addOns?: string[];
  revisionsIncluded?: number;
  supportDuration?: string;
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
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [portfolioItems, setPortfolioItems] = useReactState<PortfolioItem[]>([]);
  const [servicePackages, setServicePackages] = useReactState<ServicePackage[]>([]);
  const [pricingTemplates, setPricingTemplates] = useReactState<PricingTemplateForm[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useReactState<WeeklySchedule>({});
  const [selectedCategories, setSelectedCategories] = useReactState<string[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useReactState<string | null>(null);
  const [languageEntries, setLanguageEntries] = useReactState<Language[]>([]);
  
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
        title: t('common.success'),
        description: t('consultantProfile.pricingTemplates.templateCreated'),
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
        title: t('common.success'),
        description: t('consultantProfile.pricingTemplates.templateUpdated'),
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
        title: t('common.success'),
        description: t('consultantProfile.pricingTemplates.templateDeleted'),
      });
    },
  });

  // Reviews state and queries
  const [reviewsPage, setReviewsPage] = useState(0);
  const reviewsPerPage = 5;

  // Quote request state
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [projectDescription, setProjectDescription] = useState('');

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

  // Create quote request mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: { consultantId: string; packageName: string; projectDescription: string }) => {
      return apiRequest('POST', '/api/quotes', data);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('consultantProfile.quoteRequested'),
      });
      setQuoteDialogOpen(false);
      setProjectDescription('');
      setSelectedPackage(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('consultantProfile.errors.quoteRequestFailed'),
        variant: "destructive",
      });
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
      yearEstablished: profile?.yearEstablished ?? undefined,
      employeeCount: profile?.employeeCount ?? undefined,
      businessRegistrationNumber: profile?.businessRegistrationNumber ?? undefined,
      operatingRegions: profile?.operatingRegions ?? undefined,
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
        yearEstablished: profile.yearEstablished ?? undefined,
        employeeCount: profile.employeeCount ?? undefined,
        businessRegistrationNumber: profile.businessRegistrationNumber ?? undefined,
        operatingRegions: profile.operatingRegions ?? undefined,
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
      
      // Initialize language entries from profile
      if (profile.languages && Array.isArray(profile.languages)) {
        setLanguageEntries(profile.languages as Language[]);
      } else {
        setLanguageEntries([]);
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
    setServicePackages([...servicePackages, { 
      name: "", 
      description: "", 
      price: "", 
      deliveryTime: "",
      addOns: [],
      revisionsIncluded: undefined,
      supportDuration: ""
    }]);
  };

  const updateServicePackage = (index: number, field: keyof ServicePackage, value: string) => {
    const updated = [...servicePackages];
    updated[index] = { ...updated[index], [field]: value };
    setServicePackages(updated);
    form.setValue('servicePackages', updated as any);
  };

  const updateServicePackageNumber = (index: number, field: keyof ServicePackage, value: number | undefined) => {
    const updated = [...servicePackages];
    updated[index] = { ...updated[index], [field]: value };
    setServicePackages(updated);
    form.setValue('servicePackages', updated as any);
  };

  const updateServicePackageAddOns = (index: number, addOnsString: string) => {
    const updated = [...servicePackages];
    const addOns = addOnsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
    updated[index] = { ...updated[index], addOns: addOns.length > 0 ? addOns : undefined };
    setServicePackages(updated);
    form.setValue('servicePackages', updated as any);
  };

  const removeServicePackage = (index: number) => {
    const updated = servicePackages.filter((_, i) => i !== index);
    setServicePackages(updated);
    form.setValue('servicePackages', updated.length > 0 ? updated as any : undefined);
  };

  // Language entry management functions
  const addLanguageEntry = () => {
    setLanguageEntries([...languageEntries, { language: '', proficiency: 'basic' }]);
  };

  const removeLanguage = (index: number) => {
    const updated = languageEntries.filter((_, i) => i !== index);
    setLanguageEntries(updated);
    form.setValue('languages', updated.length > 0 ? updated as any : undefined);
  };

  const updateLanguage = (index: number, field: 'language' | 'proficiency', value: string) => {
    const updated = [...languageEntries];
    updated[index] = { ...updated[index], [field]: value };
    setLanguageEntries(updated);
    form.setValue('languages', updated as any);
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
          title: t('common.error'),
          description: t('consultantProfile.pricingTemplates.deleteFailed'),
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
        title: t('form.validationError'),
        description: t('consultantProfile.pricingTemplates.validationError'),
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
        title: t('common.error'),
        description: t('consultantProfile.pricingTemplates.saveFailed'),
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
        title: t('common.success'),
        description: t('consultantProfile.subtitle'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('consultantProfile.errors.updateFailed'),
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
        title: t('common.success'),
        description: t('consultantProfile.categoriesSaved'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('consultantProfile.errors.categoriesSaveFailed'),
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
    if (!termsAccepted) {
      toast({
        title: t('form.required'),
        description: t('form.termsAcceptance'),
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    if (isOnboarding) {
      setLocation('/dashboard');
    } else {
      form.reset();
      setIsEditing(false);
      setTermsAccepted(false);
    }
  };

  const handleSkip = () => {
    setLocation('/dashboard');
  };

  // Quote Request Dialog Component
  const QuoteRequestDialog = () => {
    const handleSubmitQuote = () => {
      if (!selectedPackage || !profile) return;
      
      if (projectDescription.length < 50) {
        toast({
          title: t('form.validationError'),
          description: t('consultantProfile.quoteDialog.validationError'),
          variant: "destructive",
        });
        return;
      }

      createQuoteMutation.mutate({
        consultantId: profile.userId,
        packageName: selectedPackage.name,
        projectDescription,
      });
    };

    return (
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-quote-request">
          <DialogHeader>
            <DialogTitle>{t('consultantProfile.quoteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('consultantProfile.quoteDialog.description')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" data-testid="text-dialog-package-name">
                    {selectedPackage.name}
                  </CardTitle>
                  <CardDescription data-testid="text-dialog-package-description">
                    {selectedPackage.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary" data-testid="text-dialog-package-price">
                      ﷼{parseFloat(selectedPackage.price).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid="text-dialog-package-delivery">
                      {selectedPackage.deliveryTime}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label htmlFor="project-description" className="text-sm font-medium">
                  Project Description *
                </label>
                <Textarea
                  id="project-description"
                  placeholder="Describe your project requirements in detail (minimum 50 characters)..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="min-h-[150px]"
                  data-testid="textarea-project-description"
                />
                <p className="text-xs text-muted-foreground">
                  {projectDescription.length} / 50 characters minimum
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuoteDialogOpen(false);
                setProjectDescription('');
                setSelectedPackage(null);
              }}
              data-testid="button-cancel-quote"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitQuote}
              disabled={createQuoteMutation.isPending || projectDescription.length < 50}
              data-testid="button-submit-quote"
            >
              {createQuoteMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
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
                {t('consultantProfile.errors.failedToLoad')}
              </CardTitle>
              <CardDescription>
                {t('consultantProfile.errors.unableToFetch')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => refetch()}
                className="w-full bg-primary text-primary-foreground"
                data-testid="button-retry-profile"
              >
                {t('consultantProfile.errors.retry')}
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
                <CardTitle>{t('consultantProfile.noProfile')}</CardTitle>
                <CardDescription>
                  {t('consultantProfile.noProfileDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full"
                  data-testid="button-create-profile"
                >
                  {t('consultantProfile.createProfile')}
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
          <h1 className="text-3xl font-bold" data-testid="text-profile-title">{t('consultantProfile.title')}</h1>
          <p className="text-muted-foreground">{t('consultantProfile.subtitle')}</p>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="default"
            data-testid="button-edit-profile"
          >
            <Edit className="h-4 w-4 mr-2" />
            {t('consultantProfile.editProfile')}
          </Button>
        )}
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('consultantProfile.editTitle')}</CardTitle>
            <CardDescription>{t('consultantProfile.editDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {isOnboarding && (
                  <Alert className="mb-6" data-testid="alert-onboarding">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t('consultantProfile.onboardingWelcome')}
                    </AlertDescription>
                  </Alert>
                )}
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('consultantProfile.fields.fullName')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('consultantProfile.fields.fullNamePlaceholder')} {...field} data-testid="input-fullname" />
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
                      <FormLabel>{t('consultantProfile.fields.title')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('consultantProfile.fields.titlePlaceholder')} {...field} value={field.value ?? ""} data-testid="input-title" />
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
                      <FormLabel>{t('consultantProfile.fields.bio')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('consultantProfile.fields.bioPlaceholder')}
                          className="min-h-[120px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('consultantProfile.fields.bioDescription')}
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
                        <FormLabel>{t('consultantProfile.fields.hourlyRate')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder={t('consultantProfile.fields.hourlyRatePlaceholder')} 
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
                        <FormLabel>{t('consultantProfile.fields.experience')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-experience">
                              <SelectValue placeholder={t('consultantProfile.fields.experiencePlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="junior">{t('consultantProfile.experienceLevels.junior')}</SelectItem>
                            <SelectItem value="mid">{t('consultantProfile.experienceLevels.mid')}</SelectItem>
                            <SelectItem value="senior">{t('consultantProfile.experienceLevels.senior')}</SelectItem>
                            <SelectItem value="expert">{t('consultantProfile.experienceLevels.expert')}</SelectItem>
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
                      <FormLabel>{t('consultantProfile.fields.skills')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('consultantProfile.fields.skillsPlaceholder')} 
                          value={field.value?.join(', ') ?? ""} 
                          onChange={(e) => {
                            const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                            field.onChange(skills.length > 0 ? skills : undefined);
                          }}
                          data-testid="input-skills" 
                        />
                      </FormControl>
                      <FormDescription>
                        {t('consultantProfile.fields.skillsDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="languages"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-3">
                        <FormLabel>{t('consultantProfile.languages.title')}</FormLabel>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={addLanguageEntry}
                          data-testid="button-add-language"
                        >
                          {t('consultantProfile.languages.addLanguage')}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {languageEntries.map((entry, index) => (
                          <div key={index} className="flex gap-2">
                            <Input 
                              placeholder={t('consultantProfile.languages.languagePlaceholder')}
                              value={entry.language}
                              onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                              data-testid={`input-language-name-${index}`}
                              className="flex-1"
                            />
                            <Select 
                              value={entry.proficiency}
                              onValueChange={(value) => updateLanguage(index, 'proficiency', value)}
                            >
                              <SelectTrigger data-testid={`select-proficiency-${index}`} className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic">{t('consultantProfile.languages.proficiencyLevels.basic')}</SelectItem>
                                <SelectItem value="conversational">{t('consultantProfile.languages.proficiencyLevels.conversational')}</SelectItem>
                                <SelectItem value="fluent">{t('consultantProfile.languages.proficiencyLevels.fluent')}</SelectItem>
                                <SelectItem value="native">{t('consultantProfile.languages.proficiencyLevels.native')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLanguage(index)}
                              data-testid={`button-remove-language-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {languageEntries.length === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            {t('consultantProfile.languages.noLanguages')}
                          </div>
                        )}
                      </div>
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
                        <FormLabel>{t('consultantProfile.fields.location')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('consultantProfile.fields.locationPlaceholder')} {...field} value={field.value ?? ""} data-testid="input-location" />
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
                        <FormLabel>{t('consultantProfile.fields.availability')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-availability">
                              <SelectValue placeholder={t('consultantProfile.fields.availabilityPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">{t('consultantProfile.availabilityStatuses.available')}</SelectItem>
                            <SelectItem value="busy">{t('consultantProfile.availabilityStatuses.busy')}</SelectItem>
                            <SelectItem value="unavailable">{t('consultantProfile.availabilityStatuses.unavailable')}</SelectItem>
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
                    {t('consultantProfile.weeklySchedule.title')}
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
                                  {t(`consultantProfile.weeklySchedule.timeSlots.${slot}`)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {WEEKDAYS.map(day => (
                              <tr key={day} className="border-b last:border-b-0">
                                <td className="text-sm font-medium p-2 w-24" data-testid={`label-${day}`}>
                                  {t(`consultantProfile.weeklySchedule.days.${day}`)}
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
                        {t('consultantProfile.weeklySchedule.description')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('consultantProfile.businessInfo')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yearEstablished"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('consultantProfile.fields.yearEstablished')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1900"
                              max={new Date().getFullYear()}
                              placeholder={t('consultantProfile.fields.yearEstablishedPlaceholder')}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-year-established" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employeeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('consultantProfile.fields.employeeCount')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee-count">
                                <SelectValue placeholder={t('consultantProfile.fields.employeeCountPlaceholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-10">{t('consultantProfile.employeeCounts.1-10')}</SelectItem>
                              <SelectItem value="11-50">{t('consultantProfile.employeeCounts.11-50')}</SelectItem>
                              <SelectItem value="51-200">{t('consultantProfile.employeeCounts.51-200')}</SelectItem>
                              <SelectItem value="201+">{t('consultantProfile.employeeCounts.201+')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="businessRegistrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('consultantProfile.fields.businessRegistrationNumber')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('consultantProfile.fields.businessRegistrationPlaceholder')} 
                            {...field} 
                            value={field.value ?? ""} 
                            data-testid="input-business-registration" 
                          />
                        </FormControl>
                        <FormDescription>
                          {t('consultantProfile.fields.businessRegistrationDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="operatingRegions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('consultantProfile.fields.operatingRegions')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('consultantProfile.fields.operatingRegionsPlaceholder')} 
                            value={field.value?.join(', ') ?? ""} 
                            onChange={(e) => {
                              const regions = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                              field.onChange(regions.length > 0 ? regions : undefined);
                            }}
                            data-testid="input-operating-regions" 
                          />
                        </FormControl>
                        <FormDescription>
                          {t('consultantProfile.fields.operatingRegionsDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <FormLabel>{t('consultantProfile.portfolio.title')}</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addPortfolioItem}
                      data-testid="button-add-portfolio"
                    >
                      {t('consultantProfile.portfolio.addProject')}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {portfolioItems.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <Input
                                placeholder={t('consultantProfile.portfolio.projectTitle')}
                                value={item.title}
                                onChange={(e) => updatePortfolioItem(index, 'title', e.target.value)}
                                data-testid={`input-portfolio-title-${index}`}
                              />
                              <Textarea
                                placeholder={t('consultantProfile.portfolio.projectDescription')}
                                value={item.description}
                                onChange={(e) => updatePortfolioItem(index, 'description', e.target.value)}
                                className="min-h-[80px] resize-none"
                                data-testid={`input-portfolio-description-${index}`}
                              />
                              <Input
                                placeholder={t('consultantProfile.portfolio.projectUrl')}
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
                        {t('consultantProfile.portfolio.noProjects')}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <FormLabel>{t('consultantProfile.servicePackages.title')}</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addServicePackage}
                      data-testid="button-add-service-package"
                    >
                      {t('consultantProfile.servicePackages.addPackage')}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {servicePackages.map((pkg, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <Input
                                placeholder={t('consultantProfile.servicePackages.packageName')}
                                value={pkg.name}
                                onChange={(e) => updateServicePackage(index, 'name', e.target.value)}
                                data-testid={`input-package-name-${index}`}
                              />
                              <Textarea
                                placeholder={t('consultantProfile.servicePackages.packageDescription')}
                                value={pkg.description}
                                onChange={(e) => updateServicePackage(index, 'description', e.target.value)}
                                className="min-h-[80px] resize-none"
                                data-testid={`input-package-description-${index}`}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  type="number"
                                  placeholder={t('consultantProfile.servicePackages.price')}
                                  value={pkg.price}
                                  onChange={(e) => updateServicePackage(index, 'price', e.target.value)}
                                  data-testid={`input-package-price-${index}`}
                                />
                                <Input
                                  placeholder={t('consultantProfile.servicePackages.deliveryTime')}
                                  value={pkg.deliveryTime}
                                  onChange={(e) => updateServicePackage(index, 'deliveryTime', e.target.value)}
                                  data-testid={`input-package-delivery-${index}`}
                                />
                              </div>
                              <Input
                                placeholder={t('consultantProfile.servicePackages.addOns')}
                                value={pkg.addOns?.join(', ') ?? ""}
                                onChange={(e) => updateServicePackageAddOns(index, e.target.value)}
                                data-testid={`input-package-addons-${index}`}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder={t('consultantProfile.servicePackages.revisionsIncluded')}
                                  value={pkg.revisionsIncluded ?? ""}
                                  onChange={(e) => updateServicePackageNumber(index, 'revisionsIncluded', e.target.value ? parseInt(e.target.value) : undefined)}
                                  data-testid={`input-package-revisions-${index}`}
                                />
                                <Input
                                  placeholder={t('consultantProfile.servicePackages.supportDuration')}
                                  value={pkg.supportDuration ?? ""}
                                  onChange={(e) => updateServicePackage(index, 'supportDuration', e.target.value)}
                                  data-testid={`input-package-support-${index}`}
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
                        {t('consultantProfile.servicePackages.noPackages')}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('consultantProfile.pricingTemplates.title')}
                    </FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addPricingTemplate}
                      data-testid="button-add-pricing-template"
                    >
                      {t('consultantProfile.pricingTemplates.addTemplate')}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {pricingTemplates.map((template, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <Input
                                placeholder={t('consultantProfile.pricingTemplates.templateName')}
                                value={template.name}
                                onChange={(e) => updatePricingTemplate(index, 'name', e.target.value)}
                                data-testid={`input-template-name-${index}`}
                              />
                              <Textarea
                                placeholder={t('consultantProfile.pricingTemplates.templateDescription')}
                                value={template.description}
                                onChange={(e) => updatePricingTemplate(index, 'description', e.target.value)}
                                className="min-h-[80px] resize-none"
                                data-testid={`input-template-description-${index}`}
                              />
                              <div className="grid grid-cols-3 gap-3">
                                <Input
                                  type="number"
                                  placeholder={t('consultantProfile.pricingTemplates.basePrice')}
                                  value={template.basePrice}
                                  onChange={(e) => updatePricingTemplate(index, 'basePrice', e.target.value)}
                                  data-testid={`input-template-baseprice-${index}`}
                                />
                                <Input
                                  type="number"
                                  placeholder={t('consultantProfile.pricingTemplates.hourlyRate')}
                                  value={template.hourlyRate}
                                  onChange={(e) => updatePricingTemplate(index, 'hourlyRate', e.target.value)}
                                  data-testid={`input-template-hourlyrate-${index}`}
                                />
                                <Input
                                  type="number"
                                  placeholder={t('consultantProfile.pricingTemplates.estimatedHours')}
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
                                  {template.id ? t('consultantProfile.pricingTemplates.update') : t('consultantProfile.pricingTemplates.save')}
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
                        {t('consultantProfile.pricingTemplates.noTemplates')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2" data-testid="container-terms-checkbox">
                  <Checkbox
                    id="terms-consultant"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    data-testid="checkbox-terms-acceptance"
                  />
                  <label
                    htmlFor="terms-consultant"
                    className="text-sm text-muted-foreground cursor-pointer"
                    data-testid="label-terms-acceptance"
                  >
                    {t('form.agreeToTermsPart1')}{" "}
                    <Link href="/legal/terms-and-conditions" className="text-primary hover:underline" data-testid="link-terms">
                      {t('form.termsAndConditions')}
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
                      {t('form.skipForNow')}
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
                    {t('form.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? t('form.saving') : t('form.saveChanges')}
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
                {t('consultantProfile.viewMode.professionalInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.fullName')}</div>
                <div className="font-medium" data-testid="text-fullname">
                  {profile?.fullName || t('consultantProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.title')}</div>
                <div className="font-medium" data-testid="text-title">
                  {profile?.title || t('consultantProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.experience')}</div>
                <div className="font-medium capitalize" data-testid="text-experience">
                  {profile?.experience || t('consultantProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  <Code className="h-4 w-4 inline mr-1" />
                  {t('consultantProfile.viewMode.skillsExpertise')}
                </div>
                <div className="flex flex-wrap gap-2" data-testid="text-skills">
                  {profile?.skills && profile.skills.length > 0 ? (
                    profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('consultantProfile.viewMode.noSkills')}</span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('consultantProfile.languages.title')}</div>
                <div className="flex flex-wrap gap-2">
                  {profile?.languages && Array.isArray(profile.languages) && profile.languages.length > 0 ? (
                    (profile.languages as Language[]).map((lang, index) => (
                      <Badge 
                        key={index}
                        variant={
                          lang.proficiency === 'native' ? 'default' :
                          lang.proficiency === 'advanced' ? 'default' :
                          lang.proficiency === 'intermediate' ? 'secondary' :
                          'outline'
                        }
                        data-testid={`badge-language-${index}`}
                      >
                        {lang.language} ({lang.proficiency})
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('consultantProfile.viewMode.notProvided')}</span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  <ShieldCheck className="h-4 w-4 inline mr-1" />
                  {t('consultantProfile.viewMode.verified')}
                </div>
                <div className="flex flex-wrap gap-2" data-testid="verification-badges">
                  <VerificationBadge 
                    type="email" 
                    verified={user?.emailVerified || false} 
                  />
                  <VerificationBadge 
                    type="phone" 
                    verified={(profile as any)?.phoneVerified || false}
                  />
                  <VerificationBadge 
                    type="identity" 
                    verified={(profile as any)?.identityVerified || false}
                  />
                  <VerificationBadge 
                    type="business" 
                    verified={profile?.verified || false} 
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('consultantProfile.viewMode.verified')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {t('consultantProfile.pricingAvailability')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.hourlyRate')}</div>
                <div className="font-medium" data-testid="text-hourly-rate">
                  {profile?.hourlyRate ? `﷼${parseFloat(profile.hourlyRate).toFixed(2)}/hour` : t('consultantProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.availability')}</div>
                <Badge 
                  variant={profile?.availability === 'available' ? 'default' : 'secondary'}
                  data-testid="badge-availability"
                >
                  {profile?.availability ? profile.availability.charAt(0).toUpperCase() + profile.availability.slice(1) : t('consultantProfile.viewMode.notProvided')}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  {t('consultantProfile.fields.location')}
                </div>
                <div className="font-medium" data-testid="text-location">
                  {profile?.location || t('consultantProfile.viewMode.notProvided')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t('consultantProfile.viewMode.businessDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.yearEstablished')}</div>
                <div className="font-medium" data-testid="text-year-established">
                  {profile?.yearEstablished || t('consultantProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.employeeCount')}</div>
                <div className="font-medium" data-testid="text-employee-count">
                  {profile?.employeeCount ? profile.employeeCount.replace('-', ' to ').replace('+', ' or more') : t('consultantProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.businessRegistrationNumber')}</div>
                <div className="font-medium" data-testid="text-business-registration">
                  {profile?.businessRegistrationNumber || t('consultantProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('consultantProfile.fields.operatingRegions')}</div>
                <div className="flex flex-wrap gap-2">
                  {profile?.operatingRegions && profile.operatingRegions.length > 0 ? (
                    profile.operatingRegions.map((region, index) => (
                      <Badge key={index} variant="outline" data-testid={`badge-region-${index}`}>
                        {region}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('consultantProfile.viewMode.notProvided')}</span>
                  )}
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
              <CardTitle>{t('consultantProfile.fields.bio')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap" data-testid="text-bio">
                {profile?.bio || t('consultantProfile.viewMode.noBio')}
              </div>
            </CardContent>
          </Card>

          {/* Service Categories Card - View Mode */}
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  {t('consultantProfile.categories.title')}
                </CardTitle>
                <CardDescription>
                  {t('consultantProfile.categories.description')}
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
                  {saveCategoriesMutation.isPending ? t('form.saving') : t('consultantProfile.categories.saveButton')}
                </Button>
              </div>
            </Card>
          ) : categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  {t('consultantProfile.categories.title')}
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
                  {t('consultantProfile.viewMode.portfolioProjects')}
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
                        {t('consultantProfile.viewMode.viewProject')} →
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
                  {t('consultantProfile.viewMode.pricingPackages')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(profile.servicePackages as ServicePackage[]).map((pkg, index) => (
                  <Card key={index} data-testid={`service-package-${index}`}>
                    <CardHeader>
                      <CardTitle className="text-lg" data-testid={`text-package-name-${index}`}>{pkg.name}</CardTitle>
                      <CardDescription data-testid={`text-package-description-${index}`}>{pkg.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-primary" data-testid={`text-package-price-${index}`}>
                          ﷼{parseFloat(pkg.price).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-package-delivery-${index}`}>
                          {pkg.deliveryTime}
                        </div>
                      </div>
                      
                      {pkg.addOns && pkg.addOns.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">Add-ons Included:</div>
                          <div className="flex flex-wrap gap-1">
                            {pkg.addOns.map((addon, addonIndex) => (
                              <Badge key={addonIndex} variant="secondary" className="text-xs" data-testid={`badge-addon-${index}-${addonIndex}`}>
                                {addon}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {pkg.revisionsIncluded !== undefined && (
                          <div data-testid={`text-package-revisions-${index}`}>
                            <span className="text-muted-foreground">Revisions:</span>{' '}
                            <span className="font-medium">{pkg.revisionsIncluded}</span>
                          </div>
                        )}
                        {pkg.supportDuration && (
                          <div data-testid={`text-package-support-${index}`}>
                            <span className="text-muted-foreground">Support:</span>{' '}
                            <span className="font-medium">{pkg.supportDuration}</span>
                          </div>
                        )}
                      </div>
                      
                      {user && (user.role === 'client' || user.role === 'both') && profile.userId !== user.id && (
                        <Button
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setQuoteDialogOpen(true);
                          }}
                          disabled={createQuoteMutation.isPending}
                          className="w-full"
                          data-testid={`button-request-quote-${index}`}
                        >
                          {t('quoteRequest.requestQuote')}
                        </Button>
                      )}
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
                  {t('consultantProfile.pricingTemplates.title')}
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
                        <span className="text-sm text-muted-foreground">{t('consultantProfile.pricingTemplates.basePrice')}</span>
                        <span className="text-xl font-bold text-primary" data-testid={`text-template-baseprice-${index}`}>
                          ﷼{parseFloat(template.basePrice || '0').toFixed(2)}
                        </span>
                      </div>
                      {template.hourlyRate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('consultantProfile.pricingTemplates.hourlyRate')}</span>
                          <span className="text-sm font-medium" data-testid={`text-template-hourlyrate-${index}`}>
                            ﷼{parseFloat(template.hourlyRate).toFixed(2)}/hr
                          </span>
                        </div>
                      )}
                      {template.estimatedHours && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('consultantProfile.pricingTemplates.estimatedHours')}</span>
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
                  {t('consultantProfile.reviews.title')}
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
                      {t('consultantProfile.reviews.totalReviews', { count: reviewStats.totalReviews, s: reviewStats.totalReviews !== 1 ? 's' : '' })}
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
                    <h4 className="font-semibold">{t('consultantProfile.reviews.title')}</h4>
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
                              👍 {t('consultantProfile.reviews.helpful')} ({review.helpful || 0})
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
                          {t('pagination.previous')}
                        </Button>
                        <span className="text-sm text-muted-foreground self-center">
                          {t('pagination.pageOf', { current: reviewsPage + 1, total: Math.ceil(totalReviews / reviewsPerPage) })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewsPage(prev => prev + 1)}
                          disabled={(reviewsPage + 1) * reviewsPerPage >= totalReviews}
                          data-testid="button-reviews-next"
                        >
                          {t('pagination.next')}
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
                  {t('consultantProfile.viewMode.weeklyAvailability')}
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
                        <span className="font-medium text-sm min-w-[60px]">{t(`consultantProfile.weeklySchedule.days.${day}`)}:</span>
                        <div className="flex flex-wrap gap-1">
                          {slots.map(slot => (
                            <Badge key={slot} variant="secondary" className="text-xs">
                              {t(`consultantProfile.weeklySchedule.timeSlots.${slot}`)}
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

          {/* Quote Request Dialog */}
          <QuoteRequestDialog />
        </div>
      )}
      </div>
    </UserLayout>
  );
}
