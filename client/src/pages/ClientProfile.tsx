import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientProfileSchema, insertTeamMemberSchema, type ClientProfile, type TeamMember } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Building2, Globe, MapPin, AlertCircle, Edit, Save, X, Info, Users, UserPlus, Mail, Shield, Trash2, MoreVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";
import { UserLayout } from "@/components/UserLayout";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const updateProfileSchema = insertClientProfileSchema.omit({
  userId: true,
});

type UpdateProfile = z.infer<typeof updateProfileSchema>;

export default function ClientProfile() {
  const { user, isLoading: authLoading, getSelectedRole } = useAuthContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  
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

  // Fetch team members
  const { data: teamMembers = [], isLoading: teamMembersLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/team-members'],
    enabled: !!profile && !isOnboarding,
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
        title: t('common.success'),
        description: t('clientProfile.subtitle'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clientProfile.errors.unableToFetch'),
        variant: "destructive",
      });
    },
  });

  // Team member invite form
  const inviteSchema = insertTeamMemberSchema.pick({
    email: true,
    fullName: true,
    role: true,
  });
  
  const inviteForm = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      fullName: "",
      role: "member" as const,
    },
  });

  // Team member mutations
  const inviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteSchema>) => {
      return await apiRequest('POST', '/api/team-members/invite', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
      setInviteDialogOpen(false);
      inviteForm.reset();
      toast({
        title: t('common.success'),
        description: t('clientProfile.teamSection.inviteButton'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest('DELETE', `/api/team-members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
      toast({
        title: t('common.success'),
        description: t('common.delete'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { role: string } }) => {
      return await apiRequest('PATCH', `/api/team-members/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
      setEditingMember(null);
      setSelectedRole("");
      toast({
        title: t('common.success'),
        description: t('common.update'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

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
                {t('clientProfile.errors.failedToLoad')}
              </CardTitle>
              <CardDescription>
                {t('clientProfile.errors.unableToFetch')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => refetch()}
                className="w-full bg-primary text-primary-foreground"
                data-testid="button-retry-profile"
              >
                {t('clientProfile.errors.retry')}
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
                <CardTitle>{t('clientProfile.noProfile')}</CardTitle>
                <CardDescription>
                  {t('clientProfile.noProfileDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full"
                  data-testid="button-create-profile"
                >
                  {t('clientProfile.createProfile')}
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
            <h1 className="text-3xl font-bold" data-testid="text-profile-title">{t('clientProfile.title')}</h1>
            <p className="text-muted-foreground">{t('clientProfile.subtitle')}</p>
          </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="default"
            data-testid="button-edit-profile"
          >
            <Edit className="h-4 w-4 mr-2" />
            {t('clientProfile.editProfile')}
          </Button>
        )}
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('clientProfile.editTitle')}</CardTitle>
            <CardDescription>{t('clientProfile.editDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isOnboarding && (
              <Alert className="mb-6" data-testid="alert-onboarding">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t('clientProfile.onboardingWelcome')}
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
                      <FormLabel>{t('clientProfile.fields.companyName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('clientProfile.fields.companyNamePlaceholder')} {...field} value={field.value ?? ""} data-testid="input-company-name" />
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
                      <FormLabel>{t('clientProfile.fields.contactEmail')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder={t('clientProfile.fields.contactEmailPlaceholder')} 
                          {...field} 
                          value={field.value ?? ""} 
                          data-testid="input-contact-email" 
                        />
                      </FormControl>
                      <FormDescription>{t('clientProfile.fields.contactEmailDesc')}</FormDescription>
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
                        <FormLabel>{t('clientProfile.fields.phoneCountryCode')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('clientProfile.fields.phoneCountryCodePlaceholder')} 
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
                        <FormLabel>{t('clientProfile.fields.contactPhone')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder={t('clientProfile.fields.contactPhonePlaceholder')} 
                            {...field} 
                            value={field.value ?? ""} 
                            data-testid="input-contact-phone" 
                          />
                        </FormControl>
                        <FormDescription>{t('clientProfile.fields.contactPhoneDesc')}</FormDescription>
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
                      <FormLabel>{t('clientProfile.fields.businessType')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-business-type">
                            <SelectValue placeholder={t('clientProfile.fields.businessTypePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">{t('clientProfile.businessTypes.individual')}</SelectItem>
                          <SelectItem value="company">{t('clientProfile.businessTypes.company')}</SelectItem>
                          <SelectItem value="enterprise">{t('clientProfile.businessTypes.enterprise')}</SelectItem>
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
                      <FormLabel>{t('clientProfile.fields.industry')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
                            <SelectValue placeholder={t('clientProfile.fields.industryPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technology">{t('clientProfile.industries.technology')}</SelectItem>
                          <SelectItem value="finance">{t('clientProfile.industries.finance')}</SelectItem>
                          <SelectItem value="healthcare">{t('clientProfile.industries.healthcare')}</SelectItem>
                          <SelectItem value="manufacturing">{t('clientProfile.industries.manufacturing')}</SelectItem>
                          <SelectItem value="retail">{t('clientProfile.industries.retail')}</SelectItem>
                          <SelectItem value="education">{t('clientProfile.industries.education')}</SelectItem>
                          <SelectItem value="real_estate">{t('clientProfile.industries.realEstate')}</SelectItem>
                          <SelectItem value="construction">{t('clientProfile.industries.construction')}</SelectItem>
                          <SelectItem value="hospitality">{t('clientProfile.industries.hospitality')}</SelectItem>
                          <SelectItem value="telecommunications">{t('clientProfile.industries.telecommunications')}</SelectItem>
                          <SelectItem value="energy">{t('clientProfile.industries.energy')}</SelectItem>
                          <SelectItem value="transportation">{t('clientProfile.industries.transportation')}</SelectItem>
                          <SelectItem value="government">{t('clientProfile.industries.government')}</SelectItem>
                          <SelectItem value="nonprofit">{t('clientProfile.industries.nonprofit')}</SelectItem>
                          <SelectItem value="other">{t('clientProfile.industries.other')}</SelectItem>
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
                      <FormLabel>{t('clientProfile.fields.region')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder={t('clientProfile.fields.regionPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="riyadh">{t('clientProfile.regions.riyadh')}</SelectItem>
                          <SelectItem value="makkah">{t('clientProfile.regions.makkah')}</SelectItem>
                          <SelectItem value="madinah">{t('clientProfile.regions.madinah')}</SelectItem>
                          <SelectItem value="eastern">{t('clientProfile.regions.eastern')}</SelectItem>
                          <SelectItem value="asir">{t('clientProfile.regions.asir')}</SelectItem>
                          <SelectItem value="tabuk">{t('clientProfile.regions.tabuk')}</SelectItem>
                          <SelectItem value="hail">{t('clientProfile.regions.hail')}</SelectItem>
                          <SelectItem value="northern_borders">{t('clientProfile.regions.northernBorders')}</SelectItem>
                          <SelectItem value="jazan">{t('clientProfile.regions.jazan')}</SelectItem>
                          <SelectItem value="najran">{t('clientProfile.regions.najran')}</SelectItem>
                          <SelectItem value="al_bahah">{t('clientProfile.regions.alBahah')}</SelectItem>
                          <SelectItem value="al_jawf">{t('clientProfile.regions.alJawf')}</SelectItem>
                          <SelectItem value="qassim">{t('clientProfile.regions.qassim')}</SelectItem>
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
                      <FormLabel>{t('clientProfile.fields.companySize')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-company-size">
                            <SelectValue placeholder={t('clientProfile.fields.companySizePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-10">{t('clientProfile.companySizes.1-10')}</SelectItem>
                          <SelectItem value="11-50">{t('clientProfile.companySizes.11-50')}</SelectItem>
                          <SelectItem value="51-200">{t('clientProfile.companySizes.51-200')}</SelectItem>
                          <SelectItem value="201-500">{t('clientProfile.companySizes.201-500')}</SelectItem>
                          <SelectItem value="500+">{t('clientProfile.companySizes.500+')}</SelectItem>
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
                      <FormLabel>{t('clientProfile.fields.website')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('clientProfile.fields.websitePlaceholder')} {...field} value={field.value ?? ""} data-testid="input-website" />
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
                      <FormLabel>{t('clientProfile.fields.location')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('clientProfile.fields.locationPlaceholder')} {...field} value={field.value ?? ""} data-testid="input-location" />
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
                      <FormLabel>{t('clientProfile.fields.description')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('clientProfile.fields.descriptionPlaceholder')}
                          className="min-h-[120px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('clientProfile.fields.descriptionHelp')}
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
                    {t('form.termsAcceptance')}{" "}
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
                    {t('common.cancel')}
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
                <Building2 className="h-5 w-5 text-primary" />
                {t('clientProfile.companyInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('clientProfile.fields.companyName')}</div>
                <div className="font-medium" data-testid="text-company-name">
                  {profile?.companyName || t('clientProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('clientProfile.fields.businessType')}</div>
                <div className="font-medium capitalize" data-testid="text-business-type">
                  {profile?.businessType ? t(`clientProfile.businessTypes.${profile.businessType}`) : t('clientProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('clientProfile.fields.industry')}</div>
                <div className="font-medium capitalize" data-testid="text-industry">
                  {profile?.industry ? t(`clientProfile.industries.${profile.industry}`) : t('clientProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('clientProfile.fields.region')}</div>
                <div className="font-medium capitalize" data-testid="text-region">
                  {profile?.region ? t(`clientProfile.regions.${profile.region}`) : t('clientProfile.viewMode.notProvided')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('clientProfile.fields.companySize')}</div>
                <div className="font-medium" data-testid="text-company-size">
                  {profile?.companySize ? t(`clientProfile.companySizes.${profile.companySize}`) : t('clientProfile.viewMode.notProvided')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('clientProfile.contactDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('clientProfile.fields.website')}</div>
                <div className="font-medium" data-testid="text-website">
                  {profile?.website ? (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {profile.website}
                    </a>
                  ) : (
                    t('clientProfile.viewMode.notProvided')
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  {t('clientProfile.fields.location')}
                </div>
                <div className="font-medium" data-testid="text-location">
                  {profile?.location || t('clientProfile.viewMode.notProvided')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('clientProfile.aboutCompany')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap" data-testid="text-description">
                {profile?.description || t('clientProfile.viewMode.noDescription')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Members Section - visible in both edit and view modes */}
      {profile && !isOnboarding && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('clientProfile.teamMembers')}
              </CardTitle>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-invite-member">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('clientProfile.teamSection.inviteButton')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('clientProfile.inviteDialog.title')}</DialogTitle>
                    <DialogDescription>
                      {t('clientProfile.inviteDialog.description')}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={inviteForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('clientProfile.inviteDialog.fullName')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('clientProfile.inviteDialog.fullNamePlaceholder')} data-testid="input-member-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('clientProfile.inviteDialog.email')}</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder={t('clientProfile.inviteDialog.emailPlaceholder')} data-testid="input-member-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={inviteForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('clientProfile.inviteDialog.role')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-member-role">
                                  <SelectValue placeholder={t('clientProfile.inviteDialog.rolePlaceholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">{t('clientProfile.memberRoles.admin')}</SelectItem>
                                <SelectItem value="member">{t('clientProfile.memberRoles.member')}</SelectItem>
                                <SelectItem value="viewer">{t('clientProfile.memberRoles.viewer')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t('clientProfile.inviteDialog.roleDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setInviteDialogOpen(false)}
                          data-testid="button-cancel-invite"
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={inviteMutation.isPending} data-testid="button-send-invite">
                          {inviteMutation.isPending ? t('clientProfile.inviteDialog.sending') : t('clientProfile.inviteDialog.sendInvitation')}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              {/* Edit Member Dialog */}
              <Dialog 
                open={!!editingMember} 
                onOpenChange={(open) => {
                  if (!open) {
                    setEditingMember(null);
                    setSelectedRole("");
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('clientProfile.editMemberDialog.title')}</DialogTitle>
                    <DialogDescription>
                      {t('clientProfile.editMemberDialog.description', { name: editingMember?.fullName || editingMember?.email })}
                    </DialogDescription>
                  </DialogHeader>
                  {editingMember && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-role">{t('clientProfile.editMemberDialog.role')}</Label>
                        <Select
                          value={selectedRole || editingMember.role}
                          onValueChange={setSelectedRole}
                        >
                          <SelectTrigger id="edit-role" data-testid="select-edit-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{t('clientProfile.memberRoles.admin')}</SelectItem>
                            <SelectItem value="member">{t('clientProfile.memberRoles.member')}</SelectItem>
                            <SelectItem value="viewer">{t('clientProfile.memberRoles.viewer')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingMember(null);
                            setSelectedRole("");
                          }}
                          data-testid="button-cancel-edit"
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          onClick={() => {
                            if (editingMember) {
                              const roleToUpdate = selectedRole || editingMember.role;
                              updateMemberMutation.mutate({
                                id: editingMember.id,
                                data: { role: roleToUpdate }
                              });
                            }
                          }}
                          disabled={updateMemberMutation.isPending || editingMember.status === 'revoked'}
                          data-testid="button-save-edit"
                        >
                          {updateMemberMutation.isPending ? t('form.saving') : t('form.saveChanges')}
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              {t('clientProfile.teamSection.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-members">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('clientProfile.teamSection.noMembers')}</p>
                <p className="text-sm">{t('clientProfile.teamSection.noMembersDesc')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`member-${member.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {member.fullName?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" data-testid={`text-member-name-${member.id}`}>
                          {member.fullName || "Unnamed"}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.status === 'accepted' ? 'default' : 'secondary'} data-testid={`badge-status-${member.id}`}>
                          {t(`clientProfile.memberStatuses.${member.status}`)}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-role-${member.id}`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {t(`clientProfile.memberRoles.${member.role}`)}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-member-actions-${member.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingMember(member)}
                          data-testid={`button-edit-member-${member.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Remove ${member.fullName || member.email} from team?`)) {
                              removeMemberMutation.mutate(member.id);
                            }
                          }}
                          className="text-destructive"
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </UserLayout>
  );
}
