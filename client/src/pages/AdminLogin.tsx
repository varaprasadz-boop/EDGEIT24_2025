import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    if (requiresTwoFactor && !twoFactorToken) {
      toast({
        title: "Error",
        description: "Please enter your two-factor authentication code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/admin/login", {
        email,
        password,
        ...(requiresTwoFactor && { twoFactorToken }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if 2FA is required
        if (data.requiresTwoFactor) {
          setRequiresTwoFactor(true);
          toast({
            title: "Two-Factor Authentication Required",
            description: "Please enter your authentication code",
          });
          setIsLoading(false);
          return;
        }
        
        // Successful login
        toast({
          title: "Welcome back!",
          description: `Logged in as ${data.adminRole.role}`,
        });
        setLocation("/admin/dashboard");
      } else {
        const error = await response.json();
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials or insufficient permissions",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">EDGEIT24 Admin</CardTitle>
          <CardDescription>
            Sign in to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!requiresTwoFactor ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="superadmin@edgeit24.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-password"
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label htmlFor="twoFactorToken" className="text-sm font-medium">
                  Two-Factor Authentication Code
                </label>
                <Input
                  id="twoFactorToken"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-2fa-token"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {requiresTwoFactor ? "Verifying..." : "Signing in..."}
                </>
              ) : requiresTwoFactor ? (
                "Verify Code"
              ) : (
                "Sign In"
              )}
            </Button>
            {requiresTwoFactor && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorToken("");
                }}
                data-testid="button-back"
              >
                Back to Login
              </Button>
            )}
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>For demo purposes:</p>
            <p className="font-mono text-xs mt-1">superadmin@edgeit24.com / 123456</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
