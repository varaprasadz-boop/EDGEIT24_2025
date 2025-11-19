import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function Login() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: t('login.errors.missingInfo'),
        description: t('login.errors.fillAllFields'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
        rememberMe,
      });

      if (!response) {
        throw new Error("No response from server");
      }

      if (response.ok) {
        const data = await response.json();
        
        // Check if 2FA verification is required
        if (data.requires2FA) {
          sessionStorage.setItem('pending2FA', JSON.stringify({
            userId: data.userId,
            rememberMe
          }));
          setIsSubmitting(false);
          setLocation('/verify-2fa');
          return;
        }
        
        toast({
          title: t('login.success.welcomeBack'),
          description: t('login.success.loggedIn'),
        });
        
        // Refresh the page to load user data
        window.location.href = "/dashboard";
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: t('login.errors.loginFailed'),
          description: error.message || t('auth.invalidCredentials'),
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('auth.invalidCredentials'),
      });
      setIsSubmitting(false);
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

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-login-title">
              {t('login.pageTitle')}
            </h1>
            <p className="mt-2 text-muted-foreground" data-testid="text-login-subtitle">
              {t('login.subtitle')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('auth.login')}</CardTitle>
              <CardDescription>
                {t('login.cardDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('login.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('login.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      data-testid="checkbox-remember-me"
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm cursor-pointer text-muted-foreground"
                    >
                      {t('auth.rememberMe')}
                    </label>
                  </div>
                  <div className="text-sm">
                    <a
                      href="/forgot-password"
                      className="text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      {t('auth.forgotPassword')}
                    </a>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground"
                    size="lg"
                    disabled={isSubmitting}
                    data-testid="button-submit-login"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('auth.loggingIn')}
                      </>
                    ) : (
                      <>
                        {t('auth.signInButton')}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center pt-4 text-sm text-muted-foreground">
                  {t('login.noAccount')}{" "}
                  <a 
                    href="/register" 
                    className="text-primary hover:underline font-medium"
                    data-testid="link-register"
                  >
                    {t('login.signUp')}
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
