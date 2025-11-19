import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CountrySelector } from "@/components/CountrySelector";
import { CategoryTreeSelector } from "@/components/CategoryTreeSelector";
import {
  Briefcase,
  Code,
  ArrowRight,
  CheckCircle2,
  Shield,
  TrendingUp,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Building,
  Phone
} from "lucide-react";

type Role = "client" | "consultant" | null;
type Step = "role" | "basic" | "categories";

export default function Register() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [engagementPlan, setEngagementPlan] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ['/api/subscription-plans'],
    enabled: step === 'basic', // Only fetch when on basic step
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleRoleSelect = (role: "client" | "consultant") => {
    setSelectedRole(role);
    setStep("basic");
  };

  const handleBasicInfoNext = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !email || !password || !country || !phone || !companyName) {
      toast({
        variant: "destructive",
        title: t('register.errors.missingInfo'),
        description: t('register.errors.fillAllFields'),
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: t('register.errors.invalidPassword'),
        description: t('register.errors.passwordMinLength'),
      });
      return;
    }

    if (!engagementPlan) {
      toast({
        variant: "destructive",
        title: t('register.errors.missingInfo'),
        description: t('register.errors.selectPlan'),
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        variant: "destructive",
        title: t('register.errors.termsRequired'),
        description: t('register.errors.acceptTerms'),
      });
      return;
    }

    // If consultant, go to categories step. If client, submit directly
    if (selectedRole === "consultant") {
      setStep("categories");
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async (categoriesOverride?: string[]) => {
    setIsSubmitting(true);

    // Use override if provided, otherwise use state
    const categoriesToSend = categoriesOverride !== undefined ? categoriesOverride : selectedCategories;

    try {
      // Find the selected plan to get its name and check if payment is required
      const selectedPlan = plans?.find((p: any) => p.id === engagementPlan);
      const isPaidPlan = selectedPlan && parseFloat(selectedPlan.price) > 0;
      
      // Map plan name to backend expected format (lowercase)
      const planIdentifier = selectedPlan ? selectedPlan.name.toLowerCase() : '';
      
      const response = await apiRequest("POST", "/api/auth/signup", {
        fullName,
        email,
        password,
        country,
        phoneCountryCode,
        phone,
        companyName,
        role: selectedRole,
        selectedCategories: selectedRole === "consultant" ? categoriesToSend : undefined,
        engagementPlan: planIdentifier, // Send 'basic', 'professional', or 'enterprise'
        termsAccepted,
      });

      if (response.ok) {
        const data = await response.json();
        
        if (isPaidPlan) {
          // Create checkout session for paid plans
          const checkoutResponse = await apiRequest('POST', '/api/payments/checkout', {
            userId: data.user.id,
            planId: engagementPlan
          });
          
          const checkoutData = await checkoutResponse.json();
          
          toast({
            title: t('register.success.accountCreated'),
            description: t('register.success.completePayment'),
          });
          window.location.href = checkoutData.checkoutUrl;
        } else {
          // Redirect to login for free plan
          toast({
            title: t('register.success.accountCreated'),
            description: t('register.success.welcomeLogin'),
          });
          window.location.href = "/login";
        }
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: t('register.errors.signupFailed'),
          description: error.message || t('register.errors.failedToCreate'),
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('register.errors.unexpectedError'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === "basic") {
      setStep("role");
      setSelectedRole(null);
    } else if (step === "categories") {
      setStep("basic");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#0A0E27] py-16 md:py-20 border-b-2 border-primary/30">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" data-testid="badge-register">
                {step === "role" && t('register.badge.getStarted')}
                {step === "basic" && t('register.badge.stepOf', { current: 1, total: selectedRole === "consultant" ? 2 : 1 })}
                {step === "categories" && t('register.badge.stepOf', { current: 2, total: 2 })}
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight" data-testid="text-register-title">
                {step === "role" && t('register.title.join')}
                {step === "basic" && t('register.title.signUpAs', { role: selectedRole === "client" ? t('register.roles.client') : t('register.roles.serviceProvider') })}
                {step === "categories" && t('register.title.selectExpertise')}
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto" data-testid="text-register-subtitle">
                {step === "role" && t('register.subtitle.chooseRole')}
                {step === "basic" && t('register.subtitle.enterDetails')}
                {step === "categories" && t('register.subtitle.selectCategories')}
              </p>
            </div>
          </div>
        </section>

        {/* Step 1: Role Selection */}
        {step === "role" && (
          <section className="py-16 md:py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <Card className="hover-elevate border-primary/20" data-testid="card-client-signup">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Briefcase className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl" data-testid="text-client-title">{t('register.client.title')}</CardTitle>
                    <CardDescription className="text-base" data-testid="text-client-desc">
                      {t('register.client.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{t('register.client.feature1')}</p>
                          <p className="text-xs text-muted-foreground">{t('register.client.feature1Desc')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{t('register.client.feature2')}</p>
                          <p className="text-xs text-muted-foreground">{t('register.client.feature2Desc')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{t('register.client.feature3')}</p>
                          <p className="text-xs text-muted-foreground">{t('register.client.feature3Desc')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Shield className="h-4 w-4" />
                        <span>{t('register.client.perfectFor')}</span>
                      </div>
                      <Button 
                        onClick={() => handleRoleSelect("client")}
                        className="w-full bg-primary text-primary-foreground" 
                        size="lg"
                        data-testid="button-signup-client"
                      >
                        {t('register.client.getStarted')}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover-elevate border-primary/20" data-testid="card-consultant-signup">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Code className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl" data-testid="text-consultant-title">{t('register.consultant.title')}</CardTitle>
                    <CardDescription className="text-base" data-testid="text-consultant-desc">
                      {t('register.consultant.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{t('register.consultant.feature1')}</p>
                          <p className="text-xs text-muted-foreground">{t('register.consultant.feature1Desc')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{t('register.consultant.feature2')}</p>
                          <p className="text-xs text-muted-foreground">{t('register.consultant.feature2Desc')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{t('register.consultant.feature3')}</p>
                          <p className="text-xs text-muted-foreground">{t('register.consultant.feature3Desc')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <TrendingUp className="h-4 w-4" />
                        <span>{t('register.consultant.perfectFor')}</span>
                      </div>
                      <Button 
                        onClick={() => handleRoleSelect("consultant")}
                        className="w-full bg-primary text-primary-foreground" 
                        size="lg"
                        data-testid="button-signup-consultant"
                      >
                        {t('register.consultant.getStarted')}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center mt-12">
                <p className="text-muted-foreground mb-4">{t('register.haveAccount')}</p>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setLocation('/login')}
                  data-testid="button-signin-existing"
                >
                  {t('auth.login')}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Step 2: Basic Information */}
        {step === "basic" && (
          <section className="py-16 md:py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        data-testid="button-back"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div>
                        <CardTitle>{t('register.form.createAccount')}</CardTitle>
                        <CardDescription>
                          {selectedRole === "client" ? t('register.roles.clientAccount') : t('register.roles.serviceProviderAccount')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleBasicInfoNext} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="fullName">{t('register.form.fullName')}</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="fullName"
                              type="text"
                              placeholder={t('register.form.fullNamePlaceholder')}
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="pl-10"
                              required
                              data-testid="input-fullname"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="email">{t('auth.email')}</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder={t('register.form.emailPlaceholder')}
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10"
                              required
                              data-testid="input-email"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="password">{t('auth.password')}</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type="password"
                              placeholder={t('register.form.passwordPlaceholder')}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-10"
                              required
                              minLength={6}
                              data-testid="input-password"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="companyName">{t('register.form.companyName')}</Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="companyName"
                              type="text"
                              placeholder={t('register.form.companyNamePlaceholder')}
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="pl-10"
                              required
                              data-testid="input-company"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="country">{t('register.form.country')}</Label>
                          <CountrySelector
                            value={country}
                            onChange={(countryObj) => {
                              setCountry(countryObj?.isoCode || "");
                            }}
                            onPhoneCodeChange={(code) => {
                              setPhoneCountryCode(code);
                            }}
                            testId="input-country"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="phone">{t('register.form.phone')}</Label>
                          <div className="flex gap-2">
                            <Input
                              value={phoneCountryCode}
                              disabled
                              className="w-24"
                              placeholder="+XXX"
                              data-testid="input-phone-code"
                            />
                            <div className="relative flex-1">
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="phone"
                                type="tel"
                                placeholder={t('register.form.phonePlaceholder')}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="pl-10"
                                required
                                data-testid="input-phone"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Engagement Plan Selection */}
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="engagementPlan">{t('register.form.selectPlan')}</Label>
                          {plansLoading ? (
                            <div className="text-sm text-muted-foreground">{t('register.form.loadingPlans')}</div>
                          ) : (
                            <RadioGroup
                              value={engagementPlan}
                              onValueChange={setEngagementPlan}
                              className="space-y-3"
                            >
                              {plans?.map((plan: any) => (
                                <div key={plan.id} className="flex items-center space-x-2 border rounded-md p-4 hover-elevate">
                                  <RadioGroupItem value={plan.id} id={plan.id} data-testid={`radio-plan-${plan.name.toLowerCase()}`} />
                                  <Label htmlFor={plan.id} className="flex-1 cursor-pointer">
                                    <div className="font-semibold">{plan.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {parseFloat(plan.price) === 0 ? t('register.form.free') : `${t('register.form.currency')} ${plan.price}/${t('register.form.month')}`}
                                    </div>
                                    {plan.description && (
                                      <div className="text-xs text-muted-foreground mt-1">{plan.description}</div>
                                    )}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          )}
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground"
                          size="lg"
                          disabled={isSubmitting || plansLoading}
                          data-testid="button-next-basic"
                        >
                          {selectedRole === "consultant" ? (
                            <>
                              {t('register.form.continueToCategories')}
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          ) : (
                            <>
                              {isSubmitting ? t('register.form.creatingAccount') : t('register.form.createAccountButton')}
                              {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Terms of Service Acceptance */}
                      <div className="flex items-start space-x-2 pt-2">
                        <Checkbox
                          id="terms"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                          data-testid="checkbox-terms"
                        />
                        <label
                          htmlFor="terms"
                          className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {t('register.form.agreeToThe')}{" "}
                          <a 
                            href={selectedRole === "consultant" ? "/legal/terms-consultant" : "/legal/terms-client"} 
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="link-terms"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t('register.form.termsConditions')}
                          </a>{" "}
                          {t('register.form.and')}{" "}
                          <a 
                            href="/legal/privacy-policy" 
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="link-privacy"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t('register.form.privacyPolicy')}
                          </a>
                        </label>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* Step 3: Categories (Consultants Only) */}
        {step === "categories" && selectedRole === "consultant" && (
          <section className="py-16 md:py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-3xl mx-auto">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        disabled={isSubmitting}
                        data-testid="button-back-categories"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div>
                        <CardTitle>{t('register.categories.title')}</CardTitle>
                        <CardDescription>
                          {t('register.categories.description')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <CategoryTreeSelector
                      value={selectedCategories}
                      onChange={(ids) => setSelectedCategories(ids)}
                      disabled={isSubmitting}
                      testId="category-selector"
                    />

                    <div className="pt-4 flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleSubmit([])}
                        disabled={isSubmitting}
                        data-testid="button-skip-categories"
                      >
                        {t('register.categories.skipForNow')}
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 bg-primary text-primary-foreground"
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting || selectedCategories.length === 0}
                        data-testid="button-submit-categories"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {t('register.form.creatingAccount')}
                          </>
                        ) : (
                          <>
                            {t('register.form.createAccountButton')}
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                      {selectedCategories.length > 0 
                        ? t('register.categories.selectedCount', { count: selectedCategories.length })
                        : t('register.categories.selectOrSkip')
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
