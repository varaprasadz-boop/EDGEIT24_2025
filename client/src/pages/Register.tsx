import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Briefcase,
  Code,
  ArrowRight,
  CheckCircle2,
  Shield,
  TrendingUp,
  ArrowLeft,
  Mail,
  Lock
} from "lucide-react";

type Role = "client" | "consultant" | null;

export default function Register() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"role" | "credentials">("role");
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleRoleSelect = (role: "client" | "consultant") => {
    setSelectedRole(role);
    setStep("credentials");
  };

  const handleBack = () => {
    setStep("role");
    setSelectedRole(null);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !selectedRole) {
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

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/auth/signup", {
        email,
        password,
        role: selectedRole,
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Account Created",
          description: "Welcome to EDGEIT24! Let's complete your profile.",
        });
        
        // Redirect to onboarding
        window.location.href = data.redirectPath;
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
                {step === "role" ? "Get Started" : "Create Account"}
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight" data-testid="text-register-title">
                {step === "role" ? "Join EDGEIT24" : `Sign Up as ${selectedRole === "client" ? "Client" : "Service Provider"}`}
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto" data-testid="text-register-subtitle">
                {step === "role" 
                  ? "Choose how you'd like to get started on our platform"
                  : "Enter your details to create your account"
                }
              </p>
            </div>
          </div>
        </section>

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

        {step === "credentials" && (
          <section className="py-16 md:py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-md mx-auto">
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
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
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

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
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

                      <div className="pt-4">
                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground"
                          size="lg"
                          disabled={isSubmitting}
                          data-testid="button-submit-signup"
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

                      <div className="text-center pt-4 text-sm text-muted-foreground">
                        By signing up, you agree to our{" "}
                        <a href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </a>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <div className="text-center mt-6">
                  <p className="text-muted-foreground mb-4">Already have an account?</p>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation('/login')}
                    data-testid="button-login-link"
                  >
                    Sign In Instead
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
