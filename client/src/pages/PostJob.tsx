import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CascadingCategorySelector } from "@/components/CascadingCategorySelector";
import { DynamicFormFieldRenderer } from "@/components/forms/DynamicFormFieldRenderer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Briefcase, ArrowLeft, UserCircle, Clock, AlertCircle, Users, Layers } from "lucide-react";
import { insertJobSchema, type CustomField, type Category } from "@shared/schema";
import { useAuthContext } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

// Extend schema with validation and custom field data
const postJobSchema = insertJobSchema.extend({
  categoryId: z.string().min(1, "Please select a service category"),
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  customFieldData: z.record(z.any()).optional(),
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
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [categoryPath, setCategoryPath] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
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

  // Fetch category details including custom fields
  const { data: categoryDetails, isLoading: categoryLoading } = useQuery<Category | null>({
    queryKey: ['/api/categories', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return null;
      const res = await fetch(`/api/categories/${selectedCategoryId}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
      }
      return res.json();
    },
    enabled: !!selectedCategoryId,
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
      customFieldData: {},
    },
  });

  // Update custom fields when category details are fetched
  useEffect(() => {
    if (categoryDetails?.customFields) {
      setCustomFields(categoryDetails.customFields as CustomField[]);
      // Reset customFieldData when custom fields schema changes
      form.setValue('customFieldData', {});
    } else {
      setCustomFields([]);
      form.setValue('customFieldData', {});
    }
  }, [categoryDetails]);

  const createJobMutation = useMutation({
    mutationFn: async (data: PostJobFormData) => {
      const response = await apiRequest('POST', '/api/jobs', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('postJob.toast.failed'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: t('postJob.toast.success'),
        description: t('postJob.toast.successDesc'),
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: t('postJob.toast.failed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PostJobFormData) => {
    // Guard against submission if not client
    if (!isClient) {
      toast({
        title: t('postJob.toast.authRequired'),
        description: t('postJob.toast.authRequiredDesc'),
        variant: "destructive",
      });
      return;
    }
    // Check if terms are accepted
    if (!termsAccepted) {
      toast({
        title: t('postJob.toast.termsRequired'),
        description: t('postJob.toast.termsRequiredDesc'),
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
          <p className="text-muted-foreground">{t('postJob.loading')}</p>
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
            <CardTitle>{t('postJob.loginRequired')}</CardTitle>
            <CardDescription>
              {t('postJob.loginRequiredDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('postJob.loginWithClient')}
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => setLocation(`/login?redirect=${encodeURIComponent('/post-job')}`)}
                data-testid="button-login"
              >
                {t('postJob.loginButton')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/register')}
                data-testid="button-register"
              >
                {t('postJob.createAccount')}
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
            <CardTitle>{t('postJob.clientProfileRequired')}</CardTitle>
            <CardDescription>
              {t('postJob.clientProfileRequiredDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('postJob.clientProfileBenefit')}
            </p>
            <Button onClick={() => setLocation('/profile/client')} data-testid="button-create-profile">
              {t('postJob.createClientProfile')}
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
            <CardTitle>{t('postJob.clientProfileRequired')}</CardTitle>
            <CardDescription>
              {t('postJob.clientProfileRequiredDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('postJob.clientProfileBenefit')}
            </p>
            <Button onClick={() => setLocation('/profile/client')} data-testid="button-create-profile">
              {t('postJob.createClientProfile')}
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
                {t('postJob.completeYourProfile')}
              </CardTitle>
              <CardDescription>
                {t('postJob.completeProfileDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('postJob.profileCompletion')}</span>
                  <span className="font-medium">{profileStatus.completionPercentage}%</span>
                </div>
                <Progress value={profileStatus.completionPercentage} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('postJob.completeAllFields')}
              </p>
              <Button 
                onClick={() => setLocation('/profile/client')} 
                data-testid="button-complete-profile"
              >
                {t('postJob.completeProfile')}
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
                {t('postJob.profileUnderReview')}
              </CardTitle>
              <CardDescription>
                {t('postJob.profileUnderReviewDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('postJob.profileUnderReviewNote')}
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setLocation('/browse-consultants')} 
                  data-testid="button-browse-consultants"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {t('postJob.browseConsultants')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/dashboard')} 
                  data-testid="button-dashboard"
                >
                  {t('postJob.goToDashboard')}
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
                {t('postJob.profileRejected')}
              </CardTitle>
              <CardDescription>
                {t('postJob.profileRejectedDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileStatus.adminNotes && (
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-sm font-medium mb-1">{t('postJob.adminFeedback')}</p>
                  <p className="text-sm text-muted-foreground">{profileStatus.adminNotes}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {t('postJob.updateProfileNote')}
              </p>
              <Button 
                onClick={() => setLocation('/profile/client')} 
                data-testid="button-update-profile"
              >
                {t('postJob.updateAndResubmit')}
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
                {t('postJob.profileApprovalRequired')}
              </CardTitle>
              <CardDescription>
                {t('postJob.profileApprovalRequiredDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('postJob.completeAndSubmit')}
              </p>
              <Button onClick={() => setLocation('/profile/client')} data-testid="button-view-profile">
                {t('postJob.viewProfile')}
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
          <h1 className="text-3xl font-bold">{t('postJob.title')}</h1>
          <p className="text-muted-foreground">
            {t('postJob.subtitle')}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {t('postJob.sections.jobDetails')}
              </CardTitle>
              <CardDescription>
                {t('postJob.sections.jobDetailsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('postJob.fields.serviceCategory')}</FormLabel>
                    <FormControl>
                      <CascadingCategorySelector
                        value={field.value}
                        onChange={(categoryId, path) => {
                          field.onChange(categoryId);
                          setSelectedCategoryId(categoryId || "");
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
                    <FormLabel>{t('postJob.fields.jobTitle')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('postJob.fields.jobTitlePlaceholder')}
                        disabled={createJobMutation.isPending}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('postJob.fields.jobTitleDescription')}
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
                    <FormLabel>{t('postJob.fields.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('postJob.fields.descriptionPlaceholder')}
                        rows={6}
                        disabled={createJobMutation.isPending}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('postJob.fields.descriptionDescription')}
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
                      <FormLabel>{t('postJob.fields.budgetType')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                        disabled={createJobMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-budget-type">
                            <SelectValue placeholder={t('postJob.fields.budgetTypePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">{t('postJob.fields.budgetFixed')}</SelectItem>
                          <SelectItem value="hourly">{t('postJob.fields.budgetHourly')}</SelectItem>
                          <SelectItem value="negotiable">{t('postJob.fields.budgetNegotiable')}</SelectItem>
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
                      <FormLabel>{t('postJob.fields.budget')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="number"
                          placeholder={t('postJob.fields.budgetPlaceholder')}
                          disabled={createJobMutation.isPending}
                          data-testid="input-budget"
                        />
                      </FormControl>
                      <FormDescription>{t('form.optional')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Custom Fields Section */}
          {customFields.length > 0 && (
            <Card data-testid="card-custom-fields">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  {t('postJob.sections.additionalRequirements')}
                </CardTitle>
                <CardDescription>
                  {t('postJob.sections.additionalRequirementsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicFormFieldRenderer
                  customFields={customFields}
                  namePrefix="customFieldData"
                  disabled={createJobMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

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
              {t('postJob.terms.iAgree')}{" "}
              <Link href="/legal/terms-and-conditions" className="text-primary hover:underline" data-testid="link-terms">
                {t('postJob.terms.termsAndConditions')}
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
              {t('postJob.buttons.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createJobMutation.isPending || !isClient}
              data-testid="button-submit"
            >
              {createJobMutation.isPending ? t('postJob.buttons.submitting') : t('postJob.buttons.submit')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
