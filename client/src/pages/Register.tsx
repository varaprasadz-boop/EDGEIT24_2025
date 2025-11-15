import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        title: "Missing Information",
        description: "Please fill in all fields",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Password must be at least 6 characters",
      });
      return;
    }

    if (!engagementPlan) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select an engagement plan",
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
            title: "Account Created",
            description: "Please complete your payment to activate your subscription.",
          });
          window.location.href = checkoutData.checkoutUrl;
        } else {
          // Redirect to login for free plan
          toast({
            title: "Account Created",
            description: "Welcome to EDGEIT24! You can now log in.",
          });
          window.location.href = "/login";
        }
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Signup Failed",
          description: error.message || "Failed to create account",
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
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
          <p className="text-muted-foreground">Loading...</p>
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
                {step === "role" && "Get Started"}
                {step === "basic" && "Step 1 of " + (selectedRole === "consultant" ? "2" : "1")}
                {step === "categories" && "Step 2 of 2"}
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight" data-testid="text-register-title">
                {step === "role" && "Join EDGEIT24"}
                {step === "basic" && `Sign Up as ${selectedRole === "client" ? "Client" : "Service Provider"}`}
                {step === "categories" && "Select Your Expertise"}
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto" data-testid="text-register-subtitle">
                {step === "role" && "Choose how you'd like to get started on our platform"}
                {step === "basic" && "Enter your details to create your account"}
                {step === "categories" && "Select the categories that match your skills and services"}
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
                    <CardTitle className="text-2xl" data-testid="text-client-title">I Need IT Services</CardTitle>
                    <CardDescription className="text-base" data-testid="text-client-desc">
                      Post projects and receive competitive bids from qualified IT professionals
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Post Requirements</p>
                          <p className="text-xs text-muted-foreground">Describe your IT project needs and budget</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Review Proposals</p>
                          <p className="text-xs text-muted-foreground">Compare bids from verified vendors</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Hire with Confidence</p>
                          <p className="text-xs text-muted-foreground">Secure payment and project delivery</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Shield className="h-4 w-4" />
                        <span>Perfect for businesses seeking IT expertise</span>
                      </div>
                      <Button 
                        onClick={() => handleRoleSelect("client")}
                        className="w-full bg-primary text-primary-foreground" 
                        size="lg"
                        data-testid="button-signup-client"
                      >
                        Get Started as Client
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
                    <CardTitle className="text-2xl" data-testid="text-consultant-title">I'm a Service Provider</CardTitle>
                    <CardDescription className="text-base" data-testid="text-consultant-desc">
                      Showcase your skills and bid on exciting IT projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Create Your Profile</p>
                          <p className="text-xs text-muted-foreground">Showcase portfolio and expertise</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Bid on Projects</p>
                          <p className="text-xs text-muted-foreground">Access quality projects from verified clients</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Grow Your Business</p>
                          <p className="text-xs text-muted-foreground">Build reputation and earn consistently</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <TrendingUp className="h-4 w-4" />
                        <span>Perfect for IT consultants and agencies</span>
                      </div>
                      <Button 
                        onClick={() => handleRoleSelect("consultant")}
                        className="w-full bg-primary text-primary-foreground" 
                        size="lg"
                        data-testid="button-signup-consultant"
                      >
                        Get Started as Provider
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center mt-12">
                <p className="text-muted-foreground mb-4">Already have an account?</p>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setLocation('/login')}
                  data-testid="button-signin-existing"
                >
                  Sign In
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
                        <CardTitle>Create Your Account</CardTitle>
                        <CardDescription>
                          {selectedRole === "client" ? "Client Account" : "Service Provider Account"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleBasicInfoNext} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="fullName">Full Name *</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="fullName"
                              type="text"
                              placeholder="Your full name"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="pl-10"
                              required
                              data-testid="input-fullname"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10"
                              required
                              data-testid="input-email"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="password">Password *</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type="password"
                              placeholder="Minimum 6 characters"
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
                          <Label htmlFor="companyName">Company Name *</Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="companyName"
                              type="text"
                              placeholder="Your company name"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="pl-10"
                              required
                              data-testid="input-company"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="country">Country *</Label>
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
                          <Label htmlFor="phone">Phone Number *</Label>
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
                                placeholder="Phone number"
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
                          <Label htmlFor="engagementPlan">Select Engagement Model *</Label>
                          {plansLoading ? (
                            <div className="text-sm text-muted-foreground">Loading plans...</div>
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
                                      {parseFloat(plan.price) === 0 ? 'Free' : `SAR ${plan.price}/month`}
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
                              Continue to Categories
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          ) : (
                            <>
                              {isSubmitting ? "Creating Account..." : "Create Account"}
                              {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="text-center pt-4 text-sm text-muted-foreground">
                        By signing up, you agree to our{" "}
                        <a 
                          href={selectedRole === "consultant" ? "/legal/terms-consultant" : "/legal/terms-client"} 
                          className="text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-terms"
                        >
                          Terms & Conditions
                        </a>{" "}
                        and{" "}
                        <a 
                          href="/legal/privacy-policy" 
                          className="text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-privacy"
                        >
                          Privacy Policy
                        </a>
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
                        <CardTitle>Select Your Expertise</CardTitle>
                        <CardDescription>
                          Choose the categories that match your skills and services
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
                        Skip for Now
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
                            Creating Account...
                          </>
                        ) : (
                          <>
                            Create Account
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                      {selectedCategories.length > 0 
                        ? `You've selected ${selectedCategories.length} ${selectedCategories.length === 1 ? 'category' : 'categories'}`
                        : "Select at least one category to continue, or skip for now"
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
