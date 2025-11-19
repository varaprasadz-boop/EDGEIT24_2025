import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Circle,
  Building2,
  FileText,
  GraduationCap,
  CreditCard,
  ArrowRight,
  AlertCircle,
  Loader2
} from "lucide-react";

type Section = "kyc" | "education" | "bank" | "business";

// Business Info form schema (simplified for MVP)
const businessInfoSchema = z.object({
  companyName: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  location: z.string().optional(),
  // Consultant-specific fields
  title: z.string().optional(),
  bio: z.string().optional(),
  hourlyRate: z.string().optional(),
  experience: z.string().optional(),
});

type BusinessInfo = z.infer<typeof businessInfoSchema>;

export default function ProfileCompletion() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, getProfileStatus, getApprovalStatus } = useAuthContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState<Section>("kyc");
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());

  const sections: { id: Section; title: string; description: string; icon: typeof Building2 }[] = [
    {
      id: "kyc",
      title: t('profileCompletion.sections.kyc.title'),
      description: t('profileCompletion.sections.kyc.description'),
      icon: FileText
    },
    {
      id: "education",
      title: t('profileCompletion.sections.education.title'),
      description: t('profileCompletion.sections.education.description'),
      icon: GraduationCap
    },
    {
      id: "bank",
      title: t('profileCompletion.sections.bank.title'),
      description: t('profileCompletion.sections.bank.description'),
      icon: CreditCard
    },
    {
      id: "business",
      title: t('profileCompletion.sections.business.title'),
      description: t('profileCompletion.sections.business.description'),
      icon: Building2
    }
  ];

  // Check authentication and approval status
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Redirect if already approved
  useEffect(() => {
    if (user) {
      const clientApprovalStatus = getApprovalStatus("client");
      const consultantApprovalStatus = getApprovalStatus("consultant");
      
      if (clientApprovalStatus === "approved" || consultantApprovalStatus === "approved") {
        setLocation("/dashboard");
      }
    }
  }, [user, getApprovalStatus, setLocation]);

  // Determine user's role for profile completion
  const isClient = user?.role === "client" || user?.role === "both";
  const isConsultant = user?.role === "consultant" || user?.role === "both";

  // Fetch existing profile data
  const { data: clientProfile } = useQuery<any>({
    queryKey: ["/api/profile/client"],
    enabled: !!user && isClient,
    retry: false,
  });

  const { data: consultantProfile } = useQuery<any>({
    queryKey: ["/api/profile/consultant"],
    enabled: !!user && isConsultant,
    retry: false,
  });

  // Business info form
  const form = useForm<BusinessInfo>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      companyName: user?.companyName || "",
      industry: clientProfile?.industry || "",
      companySize: clientProfile?.companySize || "",
      website: clientProfile?.website || consultantProfile?.website || "",
      description: clientProfile?.description || "",
      location: clientProfile?.location || consultantProfile?.location || "",
      title: consultantProfile?.title || "",
      bio: consultantProfile?.bio || "",
      hourlyRate: consultantProfile?.hourlyRate?.toString() || "",
      experience: consultantProfile?.experience || "",
    },
  });

  // Update mutation for business info
  const updateBusinessMutation = useMutation({
    mutationFn: async (data: BusinessInfo) => {
      if (isClient && !isConsultant) {
        // Client only
        return await apiRequest("PUT", "/api/profile/client", {
          companyName: data.companyName,
          industry: data.industry,
          companySize: data.companySize,
          website: data.website,
          description: data.description,
          location: data.location,
        });
      } else if (isConsultant && !isClient) {
        // Consultant only
        return await apiRequest("PUT", "/api/profile/consultant", {
          fullName: user?.fullName,
          title: data.title,
          bio: data.bio,
          hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          experience: data.experience,
          website: data.website,
          location: data.location,
        });
      } else {
        // Both roles - update both profiles
        await apiRequest("PUT", "/api/profile/client", {
          companyName: data.companyName,
          industry: data.industry,
          companySize: data.companySize,
          website: data.website,
          description: data.description,
          location: data.location,
        });
        return await apiRequest("PUT", "/api/profile/consultant", {
          fullName: user?.fullName,
          title: data.title,
          bio: data.bio,
          hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          experience: data.experience,
          website: data.website,
          location: data.location,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/client"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/consultant"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: t('profileCompletion.profileUpdated'),
        description: t('profileCompletion.profileUpdatedDescription'),
      });

      // Mark business section as complete and move to next section (or show submit button)
      handleSectionComplete("business");
    },
  });

  const handleSectionComplete = (section: Section) => {
    setCompletedSections(prev => new Set<Section>([...Array.from(prev), section]));
    
    // Move to next section
    const currentIndex = sections.findIndex(s => s.id === section);
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1].id);
    }
  };

  // Auto-complete stub sections (KYC, Education, Bank) immediately when viewed
  useEffect(() => {
    const stubSections: Section[] = ["kyc", "education", "bank"];
    if (stubSections.includes(currentSection) && !completedSections.has(currentSection)) {
      // Mark stub section as complete immediately
      setCompletedSections(prev => new Set<Section>([...Array.from(prev), currentSection]));
    }
  }, [currentSection, completedSections]);

  const handleBusinessSubmit = (data: BusinessInfo) => {
    updateBusinessMutation.mutate(data);
  };

  const handleSubmitForReview = async () => {
    try {
      // Submit profile for admin review
      if (isClient) {
        await apiRequest("POST", "/api/profiles/client/submit", {});
      }
      if (isConsultant) {
        await apiRequest("POST", "/api/profiles/consultant/submit", {});
      }

      toast({
        title: t('profileCompletion.profileSubmitted'),
        description: t('profileCompletion.profileSubmittedDescription'),
      });

      // Refresh user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to dashboard
      setLocation("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('profileCompletion.submissionFailed'),
        description: t('profileCompletion.submissionFailedDescription'),
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const progress = (completedSections.size / sections.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-profile-title">
                {t('profileCompletion.title')}
              </h1>
              <p className="text-muted-foreground" data-testid="text-profile-subtitle">
                {t('profileCompletion.subtitle')}
              </p>
            </div>
            <Badge variant="outline" data-testid="badge-profile-progress">
              {t('profileCompletion.progressBadge', { 
                completed: completedSections.size, 
                total: sections.length 
              })}
            </Badge>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2" data-testid="progress-profile" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Section Navigation */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('profileCompletion.sectionsTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isCompleted = completedSections.has(section.id);
                  const isCurrent = currentSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`w-full text-left p-3 rounded-md transition-colors flex items-start gap-3 ${
                        isCurrent ? "bg-primary/10 border border-primary/20" : "hover-elevate"
                      }`}
                      data-testid={`button-section-${section.id}`}
                    >
                      <div className="mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="font-medium text-sm">{section.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Section Content */}
          <div className="md:col-span-3">
            {/* KYC Section */}
            {currentSection === "kyc" && (
              <Card data-testid="card-kyc-section">
                <CardHeader>
                  <CardTitle>{t('profileCompletion.sections.kyc.title')}</CardTitle>
                  <CardDescription>{t('profileCompletion.sections.kyc.cardDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('profileCompletion.sections.kyc.alertMessage')}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button
                      onClick={() => handleSectionComplete("kyc")}
                      data-testid="button-skip-kyc"
                    >
                      {t('profileCompletion.skipForNow')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education Section */}
            {currentSection === "education" && (
              <Card data-testid="card-education-section">
                <CardHeader>
                  <CardTitle>{t('profileCompletion.sections.education.title')}</CardTitle>
                  <CardDescription>{t('profileCompletion.sections.education.cardDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('profileCompletion.sections.education.alertMessage')}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === "education");
                        if (currentIndex > 0) {
                          setCurrentSection(sections[currentIndex - 1].id);
                        }
                      }}
                      data-testid="button-back-education"
                    >
                      {t('profileCompletion.back')}
                    </Button>
                    <Button
                      onClick={() => handleSectionComplete("education")}
                      data-testid="button-skip-education"
                    >
                      {t('profileCompletion.skipForNow')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bank Info Section */}
            {currentSection === "bank" && (
              <Card data-testid="card-bank-section">
                <CardHeader>
                  <CardTitle>{t('profileCompletion.sections.bank.title')}</CardTitle>
                  <CardDescription>{t('profileCompletion.sections.bank.cardDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('profileCompletion.sections.bank.alertMessage')}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === "bank");
                        if (currentIndex > 0) {
                          setCurrentSection(sections[currentIndex - 1].id);
                        }
                      }}
                      data-testid="button-back-bank"
                    >
                      {t('profileCompletion.back')}
                    </Button>
                    <Button
                      onClick={() => handleSectionComplete("bank")}
                      data-testid="button-skip-bank"
                    >
                      {t('profileCompletion.skipForNow')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Business Info Section */}
            {currentSection === "business" && (
              <Card data-testid="card-business-section">
                <CardHeader>
                  <CardTitle>{t('profileCompletion.sections.business.title')}</CardTitle>
                  <CardDescription>
                    {isClient && !isConsultant && t('profileCompletion.sections.business.clientDescription')}
                    {isConsultant && !isClient && t('profileCompletion.sections.business.consultantDescription')}
                    {isClient && isConsultant && t('profileCompletion.sections.business.bothDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleBusinessSubmit)} className="space-y-6">
                      {/* Client-specific fields */}
                      {isClient && (
                        <>
                          <FormField
                            control={form.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('profileCompletion.fields.companyName')}</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-company-name" />
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
                                <FormLabel>{t('profileCompletion.fields.industry')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-industry">
                                      <SelectValue placeholder={t('profileCompletion.placeholders.selectIndustry')} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="technology">{t('profileCompletion.industries.technology')}</SelectItem>
                                    <SelectItem value="finance">{t('profileCompletion.industries.finance')}</SelectItem>
                                    <SelectItem value="healthcare">{t('profileCompletion.industries.healthcare')}</SelectItem>
                                    <SelectItem value="retail">{t('profileCompletion.industries.retail')}</SelectItem>
                                    <SelectItem value="manufacturing">{t('profileCompletion.industries.manufacturing')}</SelectItem>
                                    <SelectItem value="other">{t('profileCompletion.industries.other')}</SelectItem>
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
                                <FormLabel>{t('profileCompletion.fields.companySize')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-company-size">
                                      <SelectValue placeholder={t('profileCompletion.placeholders.selectCompanySize')} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1-10">{t('profileCompletion.companySizes.small')}</SelectItem>
                                    <SelectItem value="11-50">{t('profileCompletion.companySizes.medium')}</SelectItem>
                                    <SelectItem value="51-200">{t('profileCompletion.companySizes.large')}</SelectItem>
                                    <SelectItem value="201-500">{t('profileCompletion.companySizes.veryLarge')}</SelectItem>
                                    <SelectItem value="500+">{t('profileCompletion.companySizes.enterprise')}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('profileCompletion.fields.companyDescription')}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder={t('profileCompletion.placeholders.companyDescription')}
                                    data-testid="textarea-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      {/* Consultant-specific fields */}
                      {isConsultant && (
                        <>
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('profileCompletion.fields.professionalTitle')}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={t('profileCompletion.placeholders.professionalTitle')}
                                    data-testid="input-title"
                                  />
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
                                <FormLabel>{t('profileCompletion.fields.professionalBio')}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder={t('profileCompletion.placeholders.professionalBio')}
                                    data-testid="textarea-bio"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="hourlyRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('profileCompletion.fields.hourlyRate')}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
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
                                  <FormLabel>{t('profileCompletion.fields.experienceLevel')}</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-experience">
                                        <SelectValue placeholder={t('profileCompletion.placeholders.selectLevel')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="junior">{t('profileCompletion.experienceLevels.junior')}</SelectItem>
                                      <SelectItem value="mid">{t('profileCompletion.experienceLevels.mid')}</SelectItem>
                                      <SelectItem value="senior">{t('profileCompletion.experienceLevels.senior')}</SelectItem>
                                      <SelectItem value="expert">{t('profileCompletion.experienceLevels.expert')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}

                      {/* Common fields */}
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('profileCompletion.fields.website')}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="url"
                                placeholder={t('profileCompletion.placeholders.website')}
                                data-testid="input-website"
                              />
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
                            <FormLabel>{t('profileCompletion.fields.location')}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={t('profileCompletion.placeholders.location')} 
                                data-testid="input-location" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const currentIndex = sections.findIndex(s => s.id === "business");
                            if (currentIndex > 0) {
                              setCurrentSection(sections[currentIndex - 1].id);
                            }
                          }}
                          data-testid="button-back-business"
                        >
                          {t('profileCompletion.back')}
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateBusinessMutation.isPending}
                          data-testid="button-save-business"
                        >
                          {updateBusinessMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('profileCompletion.saving')}
                            </>
                          ) : (
                            <>
                              {t('profileCompletion.saveContinue')}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Submit for Review */}
            {completedSections.size === sections.length && (
              <Card className="mt-8 border-primary/20" data-testid="card-submit-review">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                    {t('profileCompletion.profileComplete')}
                  </CardTitle>
                  <CardDescription>
                    {t('profileCompletion.profileCompleteDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleSubmitForReview}
                    size="lg"
                    className="w-full md:w-auto bg-primary text-primary-foreground"
                    data-testid="button-submit-review"
                  >
                    {t('profileCompletion.submitForReview')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
