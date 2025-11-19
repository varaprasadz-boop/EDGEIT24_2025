import { useState } from "react";
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
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        variant: "destructive",
        title: t('forgotPassword.errors.missingInfo'),
        description: t('forgotPassword.errors.enterEmail'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/auth/request-reset", {
        email,
      });

      if (response.ok) {
        setEmailSent(true);
        toast({
          title: t('forgotPassword.success.linkSent'),
          description: t('forgotPassword.success.checkEmail'),
        });
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: t('common.error'),
          description: error.message || t('forgotPassword.errors.failedToSend'),
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('forgotPassword.errors.failedToSendTryAgain'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-forgot-password-title">
              {t('forgotPassword.pageTitle')}
            </h1>
            <p className="mt-2 text-muted-foreground" data-testid="text-forgot-password-subtitle">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('forgotPassword.cardTitle')}</CardTitle>
              <CardDescription>
                {emailSent 
                  ? t('forgotPassword.checkEmailDesc') 
                  : t('forgotPassword.sendLinkDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailSent ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('forgotPassword.emailSentMessage', { email })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('forgotPassword.didntReceive')}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEmailSent(false)}
                      data-testid="button-try-again"
                    >
                      {t('forgotPassword.tryAnotherEmail')}
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => setLocation("/login")}
                      data-testid="button-back-login"
                    >
                      {t('forgotPassword.backToLogin')}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('forgotPassword.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground"
                      size="lg"
                      disabled={isSubmitting}
                      data-testid="button-submit-reset"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('forgotPassword.sendingLink')}
                        </>
                      ) : (
                        <>
                          {t('forgotPassword.sendResetLink')}
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setLocation("/login")}
                      data-testid="button-back-login-link"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('forgotPassword.backToLogin')}
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
