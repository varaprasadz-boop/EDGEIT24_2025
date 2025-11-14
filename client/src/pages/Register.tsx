import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Briefcase,
  Code,
  ArrowRight,
  CheckCircle2,
  Users,
  TrendingUp,
  Shield,
  Clock
} from "lucide-react";

export default function Register() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleClientSignup = () => {
    window.location.href = '/api/login?role=client';
  };

  const handleConsultantSignup = () => {
    window.location.href = '/api/login?role=consultant';
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
                Get Started
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight" data-testid="text-register-title">
                Join EDGEIT24
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto" data-testid="text-register-subtitle">
                Choose how you'd like to get started on our platform
              </p>
            </div>
          </div>
        </section>

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
                      onClick={handleClientSignup}
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
                      onClick={handleConsultantSignup}
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
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-signin-existing"
              >
                Sign In
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Choose EDGEIT24?</h2>
                <p className="text-muted-foreground">Trusted by professionals across Saudi Arabia</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">1000+ Experts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Vetted IT professionals ready to help</p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Secure Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Protected transactions with escrow</p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">24/7 Support</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Always here to help you succeed</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
