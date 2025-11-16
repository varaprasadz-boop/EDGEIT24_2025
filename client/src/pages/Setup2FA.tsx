import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Setup2FAResponse {
  secret: string;
  qrCode: string;
  manualEntry: string;
}

interface VerifySetupResponse {
  message: string;
  backupCodes: string[];
}

export default function Setup2FA() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);

  const setupMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest('POST', '/api/auth/2fa/setup', { password });
      return await res.json() as Setup2FAResponse;
    },
    onSuccess: (data) => {
      setSetupData(data);
      setPasswordVerified(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to initialize 2FA setup",
        variant: "destructive",
      });
      setPassword("");
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      setupMutation.mutate(password);
    }
  };

  const verifySetupMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest('POST', '/api/auth/2fa/verify-setup', { token });
      return await res.json() as VerifySetupResponse;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      toast({
        title: "2FA Enabled Successfully",
        description: "Please save your backup codes in a secure location.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length === 6) {
      verifySetupMutation.mutate(verificationCode);
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'codes') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
    toast({
      title: "Copied to clipboard",
      description: type === 'secret' ? "Secret key copied" : "Backup codes copied",
    });
  };

  const handleComplete = () => {
    setLocation('/security');
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Enable Two-Factor Authentication
        </h1>
        <p className="text-muted-foreground mt-2">
          Secure your account with an extra layer of protection
        </p>
      </div>

      {!passwordVerified ? (
        <Card>
          <CardHeader>
            <CardTitle>Verify Your Password</CardTitle>
            <CardDescription>
              For security, please enter your password to continue with 2FA setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                  disabled={setupMutation.isPending}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={!password || setupMutation.isPending}
                  data-testid="button-verify-password"
                >
                  {setupMutation.isPending ? "Verifying..." : "Continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/security')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : !showBackupCodes ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Scan QR Code</CardTitle>
            <CardDescription>
              Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {setupData && (
              <>
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <img 
                      src={setupData.qrCode} 
                      alt="2FA QR Code" 
                      className="w-64 h-64"
                      data-testid="img-qr-code"
                    />
                  </div>
                  
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Can't scan the QR code?</p>
                        <p className="text-sm">Enter this key manually in your authenticator app:</p>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="bg-muted px-3 py-2 rounded-md text-sm font-mono flex-1" data-testid="text-manual-key">
                            {setupData.manualEntry}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(setupData.manualEntry, 'secret')}
                            data-testid="button-copy-secret"
                          >
                            {copiedSecret ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Step 2: Enter Verification Code</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      data-testid="input-verification-code"
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={verificationCode.length !== 6 || verifySetupMutation.isPending}
                      data-testid="button-verify-code"
                    >
                      {verifySetupMutation.isPending ? "Verifying..." : "Enable 2FA"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation('/security')}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              2FA Enabled Successfully!
            </CardTitle>
            <CardDescription>
              Save these backup codes in a secure location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Save these backup codes now. You won't be able to see them again.
                You can use these codes to log in if you lose access to your authenticator app.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Backup Recovery Codes</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(backupCodes.join('\n'), 'codes')}
                  data-testid="button-copy-backup-codes"
                >
                  {copiedCodes ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code
                    key={index}
                    className="bg-background px-3 py-2 rounded text-sm font-mono"
                    data-testid={`text-backup-code-${index}`}
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleComplete} 
              className="w-full"
              data-testid="button-complete-setup"
            >
              Continue to Security Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
