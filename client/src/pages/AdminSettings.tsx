import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlatformSetting } from "@shared/schema";
import { Save, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

// Helper to get setting value by key
function getSettingValue(settings: PlatformSetting[], key: string, defaultValue: string = ''): string {
  const setting = settings.find(s => s.key === key);
  return setting?.value || defaultValue;
}

// Helper to convert setting value to boolean
function getSettingBoolean(settings: PlatformSetting[], key: string, defaultValue: boolean = false): boolean {
  const value = getSettingValue(settings, key, String(defaultValue));
  return value === 'true' || value === '1';
}

// Settings form state types
interface SMTPSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
}

interface BrandingSettings {
  brand_name: string;
  brand_logo_url: string;
  brand_favicon_url: string;
  brand_primary_color: string;
  brand_support_email: string;
  brand_support_phone: string;
}

interface FeaturesSettings {
  feature_payment_enabled: boolean;
  feature_escrow_enabled: boolean;
  feature_subscription_enabled: boolean;
  feature_2fa_enabled: boolean;
  feature_email_verification_required: boolean;
}

interface FinanceSettings {
  finance_platform_fee_percentage: string;
  finance_minimum_payout: string;
  finance_currency: string;
  finance_tax_rate: string;
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("smtp");

  // Fetch all settings
  const { data: settingsData, isLoading } = useQuery<{ settings: PlatformSetting[] }>({
    queryKey: ['/api/admin/settings'],
  });

  const settings = settingsData?.settings || [];

  // Initialize form states
  const [smtpSettings, setSmtpSettings] = useState<SMTPSettings>({
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: 'EDGEIT24',
  });

  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    brand_name: 'EDGEIT24',
    brand_logo_url: '',
    brand_favicon_url: '',
    brand_primary_color: '#00D9A3',
    brand_support_email: '',
    brand_support_phone: '',
  });

  const [featuresSettings, setFeaturesSettings] = useState<FeaturesSettings>({
    feature_payment_enabled: true,
    feature_escrow_enabled: true,
    feature_subscription_enabled: true,
    feature_2fa_enabled: false,
    feature_email_verification_required: false,
  });

  const [financeSettings, setFinanceSettings] = useState<FinanceSettings>({
    finance_platform_fee_percentage: '5',
    finance_minimum_payout: '100',
    finance_currency: 'SAR',
    finance_tax_rate: '15',
  });

  // Load settings into form state when data is fetched
  useEffect(() => {
    if (settings.length > 0) {
      setSmtpSettings({
        smtp_host: getSettingValue(settings, 'smtp_host'),
        smtp_port: getSettingValue(settings, 'smtp_port', '587'),
        smtp_username: getSettingValue(settings, 'smtp_username'),
        smtp_password: getSettingValue(settings, 'smtp_password'),
        smtp_from_email: getSettingValue(settings, 'smtp_from_email'),
        smtp_from_name: getSettingValue(settings, 'smtp_from_name', 'EDGEIT24'),
      });

      setBrandingSettings({
        brand_name: getSettingValue(settings, 'brand_name', 'EDGEIT24'),
        brand_logo_url: getSettingValue(settings, 'brand_logo_url'),
        brand_favicon_url: getSettingValue(settings, 'brand_favicon_url'),
        brand_primary_color: getSettingValue(settings, 'brand_primary_color', '#00D9A3'),
        brand_support_email: getSettingValue(settings, 'brand_support_email'),
        brand_support_phone: getSettingValue(settings, 'brand_support_phone'),
      });

      setFeaturesSettings({
        feature_payment_enabled: getSettingBoolean(settings, 'feature_payment_enabled', true),
        feature_escrow_enabled: getSettingBoolean(settings, 'feature_escrow_enabled', true),
        feature_subscription_enabled: getSettingBoolean(settings, 'feature_subscription_enabled', true),
        feature_2fa_enabled: getSettingBoolean(settings, 'feature_2fa_enabled', false),
        feature_email_verification_required: getSettingBoolean(settings, 'feature_email_verification_required', false),
      });

      setFinanceSettings({
        finance_platform_fee_percentage: getSettingValue(settings, 'finance_platform_fee_percentage', '5'),
        finance_minimum_payout: getSettingValue(settings, 'finance_minimum_payout', '100'),
        finance_currency: getSettingValue(settings, 'finance_currency', 'SAR'),
        finance_tax_rate: getSettingValue(settings, 'finance_tax_rate', '15'),
      });
    }
  }, [settings]);

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async (settingData: { key: string; value: string; dataType: string; category: string; description?: string }) => {
      return apiRequest('POST', '/api/admin/settings', settingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: t('admin.settings.success.title'),
        description: t('admin.settings.success.description'),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t('admin.settings.error.title'),
        description: t('admin.settings.error.description'),
      });
    },
  });

  // Save SMTP settings
  const handleSaveSMTP = async () => {
    const settingsToSave = [
      { key: 'smtp_host', value: smtpSettings.smtp_host, dataType: 'string', category: 'smtp', description: 'SMTP server hostname' },
      { key: 'smtp_port', value: smtpSettings.smtp_port, dataType: 'number', category: 'smtp', description: 'SMTP server port' },
      { key: 'smtp_username', value: smtpSettings.smtp_username, dataType: 'string', category: 'smtp', description: 'SMTP username' },
      { key: 'smtp_password', value: smtpSettings.smtp_password, dataType: 'string', category: 'smtp', description: 'SMTP password' },
      { key: 'smtp_from_email', value: smtpSettings.smtp_from_email, dataType: 'string', category: 'smtp', description: 'From email address' },
      { key: 'smtp_from_name', value: smtpSettings.smtp_from_name, dataType: 'string', category: 'smtp', description: 'From name' },
    ];

    for (const setting of settingsToSave) {
      await saveMutation.mutateAsync(setting);
    }
  };

  // Save Branding settings
  const handleSaveBranding = async () => {
    const settingsToSave = [
      { key: 'brand_name', value: brandingSettings.brand_name, dataType: 'string', category: 'branding', description: 'Platform name' },
      { key: 'brand_logo_url', value: brandingSettings.brand_logo_url, dataType: 'string', category: 'branding', description: 'Logo URL' },
      { key: 'brand_favicon_url', value: brandingSettings.brand_favicon_url, dataType: 'string', category: 'branding', description: 'Favicon URL' },
      { key: 'brand_primary_color', value: brandingSettings.brand_primary_color, dataType: 'string', category: 'branding', description: 'Primary brand color' },
      { key: 'brand_support_email', value: brandingSettings.brand_support_email, dataType: 'string', category: 'branding', description: 'Support email' },
      { key: 'brand_support_phone', value: brandingSettings.brand_support_phone, dataType: 'string', category: 'branding', description: 'Support phone' },
    ];

    for (const setting of settingsToSave) {
      await saveMutation.mutateAsync(setting);
    }
  };

  // Save Features settings
  const handleSaveFeatures = async () => {
    const settingsToSave = [
      { key: 'feature_payment_enabled', value: String(featuresSettings.feature_payment_enabled), dataType: 'boolean', category: 'features', description: 'Enable payment processing' },
      { key: 'feature_escrow_enabled', value: String(featuresSettings.feature_escrow_enabled), dataType: 'boolean', category: 'features', description: 'Enable escrow system' },
      { key: 'feature_subscription_enabled', value: String(featuresSettings.feature_subscription_enabled), dataType: 'boolean', category: 'features', description: 'Enable subscription plans' },
      { key: 'feature_2fa_enabled', value: String(featuresSettings.feature_2fa_enabled), dataType: 'boolean', category: 'features', description: 'Enable two-factor authentication' },
      { key: 'feature_email_verification_required', value: String(featuresSettings.feature_email_verification_required), dataType: 'boolean', category: 'features', description: 'Require email verification' },
    ];

    for (const setting of settingsToSave) {
      await saveMutation.mutateAsync(setting);
    }
  };

  // Save Finance settings
  const handleSaveFinance = async () => {
    const settingsToSave = [
      { key: 'finance_platform_fee_percentage', value: financeSettings.finance_platform_fee_percentage, dataType: 'number', category: 'finance', description: 'Platform fee percentage' },
      { key: 'finance_minimum_payout', value: financeSettings.finance_minimum_payout, dataType: 'number', category: 'finance', description: 'Minimum payout amount (SAR)' },
      { key: 'finance_currency', value: financeSettings.finance_currency, dataType: 'string', category: 'finance', description: 'Platform currency' },
      { key: 'finance_tax_rate', value: financeSettings.finance_tax_rate, dataType: 'number', category: 'finance', description: 'Tax rate percentage' },
    ];

    for (const setting of settingsToSave) {
      await saveMutation.mutateAsync(setting);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <AdminPageHeader
        title={t('admin.settings.title')}
        subtitle={t('admin.settings.description')}
        testId="settings"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-settings">
          <TabsTrigger value="smtp" data-testid="tab-smtp">{t('admin.settings.tabs.smtp')}</TabsTrigger>
          <TabsTrigger value="branding" data-testid="tab-branding">{t('admin.settings.tabs.branding')}</TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">{t('admin.settings.tabs.features')}</TabsTrigger>
          <TabsTrigger value="finance" data-testid="tab-finance">{t('admin.settings.tabs.finance')}</TabsTrigger>
        </TabsList>

        {/* SMTP Settings */}
        <TabsContent value="smtp" data-testid="content-smtp">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-smtp-title">{t('admin.settings.smtp.title')}</CardTitle>
              <CardDescription data-testid="text-smtp-desc">
                {t('admin.settings.smtp.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host" data-testid="label-smtp-host">{t('admin.settings.smtp.host')}</Label>
                  <Input
                    id="smtp_host"
                    data-testid="input-smtp-host"
                    value={smtpSettings.smtp_host}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port" data-testid="label-smtp-port">{t('admin.settings.smtp.port')}</Label>
                  <Input
                    id="smtp_port"
                    data-testid="input-smtp-port"
                    value={smtpSettings.smtp_port}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: e.target.value })}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_username" data-testid="label-smtp-username">{t('admin.settings.smtp.username')}</Label>
                  <Input
                    id="smtp_username"
                    data-testid="input-smtp-username"
                    value={smtpSettings.smtp_username}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_username: e.target.value })}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password" data-testid="label-smtp-password">{t('admin.settings.smtp.password')}</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    data-testid="input-smtp-password"
                    value={smtpSettings.smtp_password}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email" data-testid="label-smtp-from-email">{t('admin.settings.smtp.fromEmail')}</Label>
                  <Input
                    id="smtp_from_email"
                    data-testid="input-smtp-from-email"
                    value={smtpSettings.smtp_from_email}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from_email: e.target.value })}
                    placeholder="noreply@edgeit24.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name" data-testid="label-smtp-from-name">{t('admin.settings.smtp.fromName')}</Label>
                  <Input
                    id="smtp_from_name"
                    data-testid="input-smtp-from-name"
                    value={smtpSettings.smtp_from_name}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from_name: e.target.value })}
                    placeholder="EDGEIT24"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveSMTP}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-smtp"
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.settings.smtp.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding" data-testid="content-branding">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-branding-title">{t('admin.settings.branding.title')}</CardTitle>
              <CardDescription data-testid="text-branding-desc">
                {t('admin.settings.branding.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_name" data-testid="label-brand-name">{t('admin.settings.branding.platformName')}</Label>
                  <Input
                    id="brand_name"
                    data-testid="input-brand-name"
                    value={brandingSettings.brand_name}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, brand_name: e.target.value })}
                    placeholder="EDGEIT24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand_primary_color" data-testid="label-brand-color">{t('admin.settings.branding.primaryColor')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brand_primary_color"
                      data-testid="input-brand-color"
                      value={brandingSettings.brand_primary_color}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, brand_primary_color: e.target.value })}
                      placeholder="#00D9A3"
                    />
                    <input
                      type="color"
                      value={brandingSettings.brand_primary_color}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, brand_primary_color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                      data-testid="input-brand-color-picker"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_logo_url" data-testid="label-brand-logo">{t('admin.settings.branding.logoUrl')}</Label>
                  <Input
                    id="brand_logo_url"
                    data-testid="input-brand-logo"
                    value={brandingSettings.brand_logo_url}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, brand_logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand_favicon_url" data-testid="label-brand-favicon">{t('admin.settings.branding.faviconUrl')}</Label>
                  <Input
                    id="brand_favicon_url"
                    data-testid="input-brand-favicon"
                    value={brandingSettings.brand_favicon_url}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, brand_favicon_url: e.target.value })}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_support_email" data-testid="label-brand-email">{t('admin.settings.branding.supportEmail')}</Label>
                  <Input
                    id="brand_support_email"
                    type="email"
                    data-testid="input-brand-email"
                    value={brandingSettings.brand_support_email}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, brand_support_email: e.target.value })}
                    placeholder="support@edgeit24.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand_support_phone" data-testid="label-brand-phone">{t('admin.settings.branding.supportPhone')}</Label>
                  <Input
                    id="brand_support_phone"
                    data-testid="input-brand-phone"
                    value={brandingSettings.brand_support_phone}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, brand_support_phone: e.target.value })}
                    placeholder="+966 50 123 4567"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveBranding}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-branding"
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.settings.branding.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features" data-testid="content-features">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-features-title">{t('admin.settings.features.title')}</CardTitle>
              <CardDescription data-testid="text-features-desc">
                {t('admin.settings.features.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="feature_payment_enabled" data-testid="label-payment-feature">{t('admin.settings.features.paymentProcessing')}</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-payment-desc">
                    {t('admin.settings.features.paymentProcessingDesc')}
                  </p>
                </div>
                <Switch
                  id="feature_payment_enabled"
                  data-testid="switch-payment-feature"
                  checked={featuresSettings.feature_payment_enabled}
                  onCheckedChange={(checked) => setFeaturesSettings({ ...featuresSettings, feature_payment_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="feature_escrow_enabled" data-testid="label-escrow-feature">{t('admin.settings.features.escrowSystem')}</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-escrow-desc">
                    {t('admin.settings.features.escrowSystemDesc')}
                  </p>
                </div>
                <Switch
                  id="feature_escrow_enabled"
                  data-testid="switch-escrow-feature"
                  checked={featuresSettings.feature_escrow_enabled}
                  onCheckedChange={(checked) => setFeaturesSettings({ ...featuresSettings, feature_escrow_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="feature_subscription_enabled" data-testid="label-subscription-feature">{t('admin.settings.features.subscriptionPlans')}</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-subscription-desc">
                    {t('admin.settings.features.subscriptionPlansDesc')}
                  </p>
                </div>
                <Switch
                  id="feature_subscription_enabled"
                  data-testid="switch-subscription-feature"
                  checked={featuresSettings.feature_subscription_enabled}
                  onCheckedChange={(checked) => setFeaturesSettings({ ...featuresSettings, feature_subscription_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="feature_2fa_enabled" data-testid="label-2fa-feature">{t('admin.settings.features.twoFactorAuth')}</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-2fa-desc">
                    {t('admin.settings.features.twoFactorAuthDesc')}
                  </p>
                </div>
                <Switch
                  id="feature_2fa_enabled"
                  data-testid="switch-2fa-feature"
                  checked={featuresSettings.feature_2fa_enabled}
                  onCheckedChange={(checked) => setFeaturesSettings({ ...featuresSettings, feature_2fa_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="feature_email_verification_required" data-testid="label-email-verification-feature">{t('admin.settings.features.emailVerification')}</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-email-verification-desc">
                    {t('admin.settings.features.emailVerificationDesc')}
                  </p>
                </div>
                <Switch
                  id="feature_email_verification_required"
                  data-testid="switch-email-verification-feature"
                  checked={featuresSettings.feature_email_verification_required}
                  onCheckedChange={(checked) => setFeaturesSettings({ ...featuresSettings, feature_email_verification_required: checked })}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveFeatures}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-features"
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.settings.features.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Settings */}
        <TabsContent value="finance" data-testid="content-finance">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-finance-title">{t('admin.settings.finance.title')}</CardTitle>
              <CardDescription data-testid="text-finance-desc">
                {t('admin.settings.finance.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="finance_platform_fee_percentage" data-testid="label-platform-fee">{t('admin.settings.finance.platformFee')}</Label>
                  <Input
                    id="finance_platform_fee_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    data-testid="input-platform-fee"
                    value={financeSettings.finance_platform_fee_percentage}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, finance_platform_fee_percentage: e.target.value })}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground" data-testid="text-platform-fee-help">
                    {t('admin.settings.finance.platformFeeHelp')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finance_minimum_payout" data-testid="label-minimum-payout">{t('admin.settings.finance.minimumPayout')}</Label>
                  <Input
                    id="finance_minimum_payout"
                    type="number"
                    min="0"
                    step="1"
                    data-testid="input-minimum-payout"
                    value={financeSettings.finance_minimum_payout}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, finance_minimum_payout: e.target.value })}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground" data-testid="text-minimum-payout-help">
                    {t('admin.settings.finance.minimumPayoutHelp')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="finance_currency" data-testid="label-currency">{t('admin.settings.finance.currency')}</Label>
                  <Input
                    id="finance_currency"
                    data-testid="input-currency"
                    value={financeSettings.finance_currency}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, finance_currency: e.target.value })}
                    placeholder="SAR"
                    maxLength={3}
                  />
                  <p className="text-xs text-muted-foreground" data-testid="text-currency-help">
                    {t('admin.settings.finance.currencyHelp')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finance_tax_rate" data-testid="label-tax-rate">{t('admin.settings.finance.taxRate')}</Label>
                  <Input
                    id="finance_tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    data-testid="input-tax-rate"
                    value={financeSettings.finance_tax_rate}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, finance_tax_rate: e.target.value })}
                    placeholder="15"
                  />
                  <p className="text-xs text-muted-foreground" data-testid="text-tax-rate-help">
                    {t('admin.settings.finance.taxRateHelp')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveFinance}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-finance"
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.settings.finance.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
