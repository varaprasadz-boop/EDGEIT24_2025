import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";

interface LoginState {
  userId?: string;
  rememberMe?: boolean;
}

export default function Verify2FA() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const { checkAuth } = useAuthContext();
  
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const pending2FA = sessionStorage.getItem('pending2FA');
  const state: LoginState = pending2FA ? JSON.parse(pending2FA) : {};
  const { userId, rememberMe } = state;

  const completeMutation = useMutation({
    mutationFn: async (data: { userId: string; token?: string; backupCode?: string; rememberMe?: boolean }) => {
      const res = await apiRequest('POST', '/api/auth/2fa/complete-login', data);
      return await res.json() as { user: any };
    },
    onSuccess: async () => {
      sessionStorage.removeItem('pending2FA');
      await checkAuth();
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: "Session Error",
        description: "Please log in again.",
        variant: "destructive",
      });
      setLocation('/login');
      return;
    }

    if (useBackupCode) {
      completeMutation.mutate({ userId, backupCode: code, rememberMe });
    } else {
      if (code.length !== 6) {
        toast({
          title: "Invalid Code",
          description: "Please enter a 6-digit verification code.",
          variant: "destructive",
        });
        return;
      }
      completeMutation.mutate({ userId, token: code, rememberMe });
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Session expired. Please log in again.</p>
            <Button onClick={() => setLocation('/login')} data-testid="button-back-to-login">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            {useBackupCode 
              ? "Enter one of your backup recovery codes"
              : "Enter the 6-digit code from your authenticator app"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">
                {useBackupCode ? "Backup Code" : "Verification Code"}
              </Label>
              <Input
                id="verification-code"
                type="text"
                placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
                value={code}
                onChange={(e) => {
                  if (useBackupCode) {
                    setCode(e.target.value.toUpperCase());
                  } else {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  }
                }}
                maxLength={useBackupCode ? 16 : 6}
                autoFocus
                data-testid="input-2fa-code"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={completeMutation.isPending || code.length === 0}
              data-testid="button-verify-2fa"
            >
              {completeMutation.isPending ? "Verifying..." : "Verify & Login"}
            </Button>

            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setCode("");
                }}
                data-testid="button-toggle-backup-code"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {useBackupCode ? "Use authenticator code" : "Use backup code"}
              </Button>
              
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/login')}
                  data-testid="button-back"
                >
                  Back to login
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
