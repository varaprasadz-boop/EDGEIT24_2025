import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        variant: "destructive",
        title: t('resetPassword.invalidLink'),
        description: t('resetPassword.noTokenFound'),
      });
      setTimeout(() => setLocation("/forgot-password"), 2000);
    }
  }, [toast, setLocation, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: t('resetPassword.missingInformation'),
        description: t('resetPassword.fillAllFields'),
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: t('resetPassword.invalidPassword'),
        description: t('resetPassword.passwordMinLength'),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: t('resetPassword.passwordsDontMatch'),
        description: t('resetPassword.passwordsMustMatch'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword,
      });

      if (response.ok) {
        setResetSuccess(true);
        toast({
          title: t('resetPassword.success'),
          description: t('resetPassword.successDescription'),
        });
        setTimeout(() => setLocation("/login"), 3000);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: t('resetPassword.resetFailed'),
          description: error.message || t('resetPassword.resetFailedDescription'),
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('resetPassword.resetFailedDescription'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('resetPassword.validatingLink')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-reset-password-title">
              {t('resetPassword.title')}
            </h1>
            <p className="mt-2 text-muted-foreground" data-testid="text-reset-password-subtitle">
              {t('resetPassword.subtitle')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('resetPassword.cardTitle')}</CardTitle>
              <CardDescription>
                {resetSuccess 
                  ? t('resetPassword.cardDescriptionSuccess')
                  : t('resetPassword.cardDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSuccess ? (
                <div className="text-center py-4">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('resetPassword.redirectingToLogin')}
                  </p>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="bg-primary text-primary-foreground"
                    data-testid="button-go-login"
                  >
                    {t('resetPassword.goToLogin')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('resetPassword.newPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder={t('resetPassword.enterNewPassword')}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                        data-testid="input-new-password"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('resetPassword.passwordHelperText')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder={t('resetPassword.confirmNewPassword')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                        data-testid="input-confirm-password"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground"
                      size="lg"
                      disabled={isSubmitting}
                      data-testid="button-submit-new-password"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('resetPassword.resetting')}
                        </>
                      ) : (
                        <>
                          {t('resetPassword.resetButton')}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
