import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user, isLoading, getSelectedRole } = useAuthContext();

  useEffect(() => {
    if (!isLoading && user) {
      // For all users, redirect based on selected role
      const selectedRole = getSelectedRole();
      if (selectedRole) {
        setLocation(`/profile/${selectedRole}`);
      } else {
        // Fallback to client if no role detected
        setLocation("/profile/client");
      }
    } else if (!isLoading && !user) {
      // Not authenticated, redirect to login
      setLocation("/login");
    }
  }, [user, isLoading, setLocation, getSelectedRole]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    </div>
  );
}
