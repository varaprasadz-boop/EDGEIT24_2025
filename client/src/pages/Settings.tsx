import { useState, useEffect } from "react";
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock, Bell, User, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import KycDocumentUpload from "@/components/KycDocumentUpload";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { NOTIFICATION_TYPES } from "@shared/schema";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  phone: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  companyName: z.string().optional(),
  bio: z.string().max(1000).optional(),
  title: z.string().max(100).optional(),
  skills: z.string().optional(), // Comma-separated skills
  hourlyRate: z.string().optional(),
  availability: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type NotificationPreferences = {
  id: string;
  userId: string;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  emailEnabledTypes: string[] | null;
  inAppEnabledTypes: string[] | null;
};

// Friendly names for notification types
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  [NOTIFICATION_TYPES.BID_RECEIVED]: 'New bid received',
  [NOTIFICATION_TYPES.BID_STATUS_UPDATE]: 'Bid status updated',
  [NOTIFICATION_TYPES.BID_AWARDED]: 'Bid awarded',
  [NOTIFICATION_TYPES.BID_REJECTED]: 'Bid rejected',
  [NOTIFICATION_TYPES.PAYMENT_DEPOSITED]: 'Payment deposited',
  [NOTIFICATION_TYPES.PAYMENT_RELEASED]: 'Payment released',
  [NOTIFICATION_TYPES.PROJECT_STATUS_CHANGE]: 'Project status changed',
  [NOTIFICATION_TYPES.MILESTONE_COMPLETED]: 'Milestone completed',
  [NOTIFICATION_TYPES.DELIVERABLE_SUBMITTED]: 'Deliverable submitted',
  [NOTIFICATION_TYPES.INVOICE_GENERATED]: 'Invoice generated',
  [NOTIFICATION_TYPES.VENDOR_INVITED]: 'Invited to bid on project',
  [NOTIFICATION_TYPES.VERIFICATION_STATUS]: 'Verification status updated',
  [NOTIFICATION_TYPES.CATEGORY_APPROVAL]: 'Category access approved',
  [NOTIFICATION_TYPES.NEW_MESSAGE]: 'New message',
  [NOTIFICATION_TYPES.REVIEW_RECEIVED]: 'Review received',
  [NOTIFICATION_TYPES.REVIEW_RESPONSE]: 'Review response',
  [NOTIFICATION_TYPES.DEADLINE_REMINDER]: 'Deadline reminder',
  [NOTIFICATION_TYPES.REFUND_PROCESSED]: 'Refund processed',
  [NOTIFICATION_TYPES.TEAM_MEMBER_ACTIVITY]: 'Team member activity',
};

const CRITICAL_TYPES = [
  NOTIFICATION_TYPES.BID_RECEIVED,
  NOTIFICATION_TYPES.BID_STATUS_UPDATE,
  NOTIFICATION_TYPES.BID_AWARDED,
  NOTIFICATION_TYPES.BID_REJECTED,
  NOTIFICATION_TYPES.PAYMENT_DEPOSITED,
  NOTIFICATION_TYPES.PAYMENT_RELEASED,
  NOTIFICATION_TYPES.PROJECT_STATUS_CHANGE,
  NOTIFICATION_TYPES.MILESTONE_COMPLETED,
  NOTIFICATION_TYPES.DELIVERABLE_SUBMITTED,
  NOTIFICATION_TYPES.INVOICE_GENERATED,
  NOTIFICATION_TYPES.VENDOR_INVITED,
  NOTIFICATION_TYPES.VERIFICATION_STATUS,
  NOTIFICATION_TYPES.CATEGORY_APPROVAL,
];

const IMPORTANT_TYPES = [
  NOTIFICATION_TYPES.NEW_MESSAGE,
  NOTIFICATION_TYPES.REVIEW_RECEIVED,
  NOTIFICATION_TYPES.REVIEW_RESPONSE,
  NOTIFICATION_TYPES.DEADLINE_REMINDER,
  NOTIFICATION_TYPES.REFUND_PROCESSED,
  NOTIFICATION_TYPES.TEAM_MEMBER_ACTIVITY,
];

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getSelectedRole, user } = useAuthContext();
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "profile");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  // Determine which fields to show based on user role and selected role
  // For dual-role users, respect their role selection
  // For single-role users, show their designated fields
  const selectedRole = getSelectedRole();
  const showConsultantFields = user?.role === 'consultant' || 
    (user?.role === 'both' && selectedRole === 'consultant');
  const showCompanyField = user?.role === 'client' || 
    (user?.role === 'both' && selectedRole === 'client');

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      phoneCountryCode: "+966",
      companyName: "",
      bio: "",
      title: "",
      skills: "",
      hourlyRate: "",
      availability: "available",
    },
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notification-preferences'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/notification-preferences');
      return res.json();
    },
    enabled: activeTab === 'notifications',
  });

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailTypes, setEmailTypes] = useState<string[] | null>(null);
  const [inAppTypes, setInAppTypes] = useState<string[] | null>(null);

  useEffect(() => {
    if (preferences) {
      setEmailEnabled(preferences.emailNotificationsEnabled);
      setInAppEnabled(preferences.inAppNotificationsEnabled);
      setEmailTypes(preferences.emailEnabledTypes);
      setInAppTypes(preferences.inAppEnabledTypes);
    }
  }, [preferences]);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('POST', '/api/auth/change-password', data);
      const body = await res.json();
      return body;
    },
    onSuccess: () => {
      toast({
        title: t('settings.passwordChanged'),
        description: t('settings.passwordChangedDesc'),
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('settings.passwordChangeFailed'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { 
      emailNotificationsEnabled?: boolean; 
      inAppNotificationsEnabled?: boolean;
      emailEnabledTypes?: string[] | null;
      inAppEnabledTypes?: string[] | null;
    }) => {
      await apiRequest('PUT', '/api/notification-preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      toast({
        title: t('settings.preferencesUpdated'),
        description: t('settings.preferencesUpdatedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('settings.updateFailed'),
        variant: "destructive",
      });
    },
  });

  // Fetch user data from auth context - it's already available
  // Fetch consultant profile if user has consultant role
  const { data: consultantData, isLoading: consultantLoading } = useQuery({
    queryKey: ['/api/profile/consultant'],
    enabled: activeTab === 'profile' && showConsultantFields,
  });

  // Load profile data into form when fetched
  useEffect(() => {
    if (user && activeTab === 'profile') {
      const consultant = consultantData as any;
      profileForm.reset({
        fullName: user.fullName || '',
        phone: user.phone || '',
        phoneCountryCode: user.phoneCountryCode || '+966',
        companyName: user.companyName || '',
        bio: consultant?.bio || '',
        title: consultant?.title || '',
        skills: consultant?.skills?.join(', ') || '',
        hourlyRate: consultant?.hourlyRate || '',
        availability: consultant?.availability || 'available',
      });
    }
  }, [user, consultantData, activeTab]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Update user fields via auth update endpoint
      const userPayload: any = {
        fullName: data.fullName,
        phone: data.phone,
        phoneCountryCode: data.phoneCountryCode,
      };
      
      // Include company name if user has client or both role
      if (showCompanyField && data.companyName) {
        userPayload.companyName = data.companyName;
      }
      
      await apiRequest('PUT', '/api/auth/update-profile', userPayload);

      // Update consultant profile if user has consultant or both role
      if (showConsultantFields) {
        const consultantPayload = {
          bio: data.bio,
          title: data.title,
          skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
          hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          availability: data.availability,
        };
        await apiRequest('PUT', '/api/profile/consultant', consultantPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/consultant'] });
      toast({
        title: t('settings.profileUpdated'),
        description: t('settings.profileUpdatedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('settings.updateFailed'),
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleEmailToggle = (checked: boolean) => {
    setEmailEnabled(checked);
    updatePreferencesMutation.mutate({ emailNotificationsEnabled: checked });
  };

  const handleInAppToggle = (checked: boolean) => {
    setInAppEnabled(checked);
    updatePreferencesMutation.mutate({ inAppNotificationsEnabled: checked });
  };

  const handleEmailTypeToggle = (type: string, checked: boolean) => {
    const newTypes = emailTypes === null 
      ? (checked ? [type] : Object.values(NOTIFICATION_TYPES).filter(t => t !== type))
      : checked 
        ? [...emailTypes, type]
        : emailTypes.filter(t => t !== type);
    
    setEmailTypes(newTypes.length === Object.values(NOTIFICATION_TYPES).length ? null : newTypes);
    updatePreferencesMutation.mutate({ emailEnabledTypes: newTypes.length === Object.values(NOTIFICATION_TYPES).length ? null : newTypes });
  };

  const handleInAppTypeToggle = (type: string, checked: boolean) => {
    const newTypes = inAppTypes === null 
      ? (checked ? [type] : Object.values(NOTIFICATION_TYPES).filter(t => t !== type))
      : checked 
        ? [...inAppTypes, type]
        : inAppTypes.filter(t => t !== type);
    
    setInAppTypes(newTypes.length === Object.values(NOTIFICATION_TYPES).length ? null : newTypes);
    updatePreferencesMutation.mutate({ inAppEnabledTypes: newTypes.length === Object.values(NOTIFICATION_TYPES).length ? null : newTypes });
  };

  const isEmailTypeEnabled = (type: string) => {
    return emailTypes === null || emailTypes.includes(type);
  };

  const isInAppTypeEnabled = (type: string) => {
    return inAppTypes === null || inAppTypes.includes(type);
  };

  return (
    <UserLayout>
      <div className="container max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-settings-title">{t('settings.title')}</h1>
          <p className="text-muted-foreground" data-testid="text-settings-subtitle">
            {t('settings.subtitle')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-settings">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" />
              {t('settings.tabs.profile')}
            </TabsTrigger>
            <TabsTrigger value="account" data-testid="tab-account">
              <Lock className="h-4 w-4 mr-2" />
              {t('settings.tabs.account')}
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <FileText className="h-4 w-4 mr-2" />
              {t('settings.tabs.documents')}
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="h-4 w-4 mr-2" />
              {t('settings.tabs.notifications')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card data-testid="card-profile-info">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('settings.profileInfo')}
                </CardTitle>
                <CardDescription>
                  {showConsultantFields ? t('settings.updateProfessionalDetails') : t('settings.updateCompanyDetails')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.fullName')} *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('form.fullNamePlaceholder')}
                                data-testid="input-profile-full-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="phoneCountryCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('form.countryCode')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="+966"
                                  data-testid="input-profile-country-code"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('form.phone')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="5xxxxxxxx"
                                  data-testid="input-profile-phone"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {showCompanyField && (
                        <FormField
                          control={profileForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('form.companyName')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t('form.companyNamePlaceholder')}
                                  data-testid="input-profile-company"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                {t('settings.companyNameDesc')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {showConsultantFields && (
                        <>
                          <FormField
                            control={profileForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('form.professionalTitle')}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={t('form.professionalTitlePlaceholder')}
                                    data-testid="input-profile-title"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('form.bio')}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder={t('form.bioPlaceholder')}
                                    className="min-h-[100px]"
                                    data-testid="input-profile-bio"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {t('form.bioDesc')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="skills"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('form.skills')}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={t('form.skillsPlaceholder')}
                                    data-testid="input-profile-skills"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {t('form.skillsDesc')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={profileForm.control}
                              name="hourlyRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('form.hourlyRate')}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder={t('form.hourlyRatePlaceholder')}
                                      data-testid="input-profile-hourly-rate"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={profileForm.control}
                              name="availability"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('form.availability')}</FormLabel>
                                  <FormControl>
                                    <select
                                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      data-testid="select-profile-availability"
                                      {...field}
                                    >
                                      <option value="available">{t('form.availableStatus')}</option>
                                      <option value="busy">{t('form.busyStatus')}</option>
                                      <option value="unavailable">{t('form.unavailableStatus')}</option>
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending ? t('common.saving') : t('common.saveChanges')}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="mt-6">
            <Card data-testid="card-change-password">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  {t('settings.changePassword')}
                </CardTitle>
                <CardDescription>
                  {t('settings.changePasswordDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.currentPassword')}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t('form.currentPasswordPlaceholder')}
                              autoComplete="current-password"
                              data-testid="input-current-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.newPassword')}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t('form.newPasswordPlaceholder')}
                              autoComplete="new-password"
                              data-testid="input-new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.confirmPassword')}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t('form.confirmPasswordPlaceholder')}
                              autoComplete="new-password"
                              data-testid="input-confirm-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-save-password"
                      >
                        {changePasswordMutation.isPending ? t('common.saving') : t('settings.changePassword')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-cancel"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <KycDocumentUpload />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card data-testid="card-notification-preferences">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t('notifications.preferences')}
                </CardTitle>
                <CardDescription>
                  {t('notifications.managePreferences')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {preferencesLoading ? (
                  <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between" data-testid="preference-email">
                      <div className="space-y-1">
                        <Label htmlFor="email-notifications" className="text-base">
                          {t('notifications.emailNotifications')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('notifications.emailNotificationsDesc')}
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={emailEnabled}
                        onCheckedChange={handleEmailToggle}
                        disabled={updatePreferencesMutation.isPending}
                        data-testid="switch-email-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between" data-testid="preference-in-app">
                      <div className="space-y-1">
                        <Label htmlFor="in-app-notifications" className="text-base">
                          {t('notifications.inAppNotifications')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('notifications.inAppNotificationsDesc')}
                        </p>
                      </div>
                      <Switch
                        id="in-app-notifications"
                        checked={inAppEnabled}
                        onCheckedChange={handleInAppToggle}
                        disabled={updatePreferencesMutation.isPending}
                        data-testid="switch-in-app-notifications"
                      />
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold mb-4">{t('notifications.criticalEvents')}</h3>
                        <div className="space-y-4">
                          {CRITICAL_TYPES.map((type) => (
                            <div key={type} className="flex items-start justify-between gap-4" data-testid={`preference-type-${type}`}>
                              <div className="flex-1 min-w-0">
                                <Label className="text-sm font-medium">
                                  {t(`notifications.types.${type}`, NOTIFICATION_TYPE_LABELS[type])}
                                </Label>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`email-${type}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    {t('common.email')}
                                  </Label>
                                  <Switch
                                    id={`email-${type}`}
                                    checked={isEmailTypeEnabled(type)}
                                    onCheckedChange={(checked) => handleEmailTypeToggle(type, checked)}
                                    disabled={!emailEnabled || updatePreferencesMutation.isPending}
                                    data-testid={`switch-email-${type}`}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`inapp-${type}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    {t('notifications.inApp')}
                                  </Label>
                                  <Switch
                                    id={`inapp-${type}`}
                                    checked={isInAppTypeEnabled(type)}
                                    onCheckedChange={(checked) => handleInAppTypeToggle(type, checked)}
                                    disabled={!inAppEnabled || updatePreferencesMutation.isPending}
                                    data-testid={`switch-inapp-${type}`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-base font-semibold mb-4">{t('notifications.importantEvents')}</h3>
                        <div className="space-y-4">
                          {IMPORTANT_TYPES.map((type) => (
                            <div key={type} className="flex items-start justify-between gap-4" data-testid={`preference-type-${type}`}>
                              <div className="flex-1 min-w-0">
                                <Label className="text-sm font-medium">
                                  {t(`notifications.types.${type}`, NOTIFICATION_TYPE_LABELS[type])}
                                </Label>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`email-${type}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    {t('common.email')}
                                  </Label>
                                  <Switch
                                    id={`email-${type}`}
                                    checked={isEmailTypeEnabled(type)}
                                    onCheckedChange={(checked) => handleEmailTypeToggle(type, checked)}
                                    disabled={!emailEnabled || updatePreferencesMutation.isPending}
                                    data-testid={`switch-email-${type}`}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`inapp-${type}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    {t('notifications.inApp')}
                                  </Label>
                                  <Switch
                                    id={`inapp-${type}`}
                                    checked={isInAppTypeEnabled(type)}
                                    onCheckedChange={(checked) => handleInAppTypeToggle(type, checked)}
                                    disabled={!inAppEnabled || updatePreferencesMutation.isPending}
                                    data-testid={`switch-inapp-${type}`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
}
