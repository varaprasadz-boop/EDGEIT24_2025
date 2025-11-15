import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { User, ClientProfile, ConsultantProfile } from "@shared/schema";

interface AuthUser extends User {
  clientProfile?: ClientProfile;
  consultantProfile?: ConsultantProfile;
}

interface AuthContextValue {
  user: AuthUser | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  getActiveRole: () => 'client' | 'consultant' | 'both' | null;
  isEmailVerified: () => boolean;
  getProfileStatus: (role?: 'client' | 'consultant') => 'incomplete' | 'complete' | 'submitted' | null;
  getApprovalStatus: (role?: 'client' | 'consultant') => 'pending' | 'approved' | 'rejected' | 'changes_requested' | null;
  getUniqueId: (role?: 'client' | 'consultant') => string | null;
  isProfileComplete: (role?: 'client' | 'consultant') => boolean;
  isProfileApproved: (role?: 'client' | 'consultant') => boolean;
  requiresEmailVerification: () => boolean;
  requiresProfileCompletion: (role?: 'client' | 'consultant') => boolean;
  requiresProfileApproval: (role?: 'client' | 'consultant') => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  const login = () => {
    window.location.href = '/login';
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const getActiveRole = (): 'client' | 'consultant' | 'both' | null => {
    if (!user) return null;
    
    const hasClientProfile = !!user.clientProfile;
    const hasConsultantProfile = !!user.consultantProfile;
    
    if (hasClientProfile && hasConsultantProfile) return 'both';
    if (hasClientProfile) return 'client';
    if (hasConsultantProfile) return 'consultant';
    
    return user.role as 'client' | 'consultant' | null;
  };

  const isEmailVerified = (): boolean => {
    return user?.emailVerified ?? false;
  };

  const getProfileForRole = (role?: 'client' | 'consultant'): ClientProfile | ConsultantProfile | undefined => {
    if (!user) return undefined;
    
    // If role explicitly provided, use that
    if (role === 'client') return user.clientProfile;
    if (role === 'consultant') return user.consultantProfile;
    
    // Otherwise use active role logic
    const activeRole = getActiveRole();
    if (activeRole === 'client') return user.clientProfile;
    if (activeRole === 'consultant') return user.consultantProfile;
    if (activeRole === 'both') return user.clientProfile; // Default to client for 'both'
    
    return undefined;
  };

  const getProfileStatus = (role?: 'client' | 'consultant'): 'incomplete' | 'complete' | 'submitted' | null => {
    const profile = getProfileForRole(role);
    return (profile?.profileStatus as 'incomplete' | 'complete' | 'submitted' | undefined) ?? null;
  };

  const getApprovalStatus = (role?: 'client' | 'consultant'): 'pending' | 'approved' | 'rejected' | 'changes_requested' | null => {
    const profile = getProfileForRole(role);
    return (profile?.approvalStatus as 'pending' | 'approved' | 'rejected' | 'changes_requested' | undefined) ?? null;
  };

  const getUniqueId = (role?: 'client' | 'consultant'): string | null => {
    if (!user) return null;
    
    // If role explicitly provided, use that
    if (role === 'client') return user.clientProfile?.uniqueClientId ?? null;
    if (role === 'consultant') return user.consultantProfile?.uniqueConsultantId ?? null;
    
    // Otherwise use active role logic
    const activeRole = getActiveRole();
    if (activeRole === 'client') return user.clientProfile?.uniqueClientId ?? null;
    if (activeRole === 'consultant') return user.consultantProfile?.uniqueConsultantId ?? null;
    if (activeRole === 'both') return user.clientProfile?.uniqueClientId ?? user.consultantProfile?.uniqueConsultantId ?? null;
    
    return null;
  };

  const isProfileComplete = (role?: 'client' | 'consultant'): boolean => {
    const status = getProfileStatus(role);
    return status === 'complete' || status === 'submitted';
  };

  const isProfileApproved = (role?: 'client' | 'consultant'): boolean => {
    const status = getApprovalStatus(role);
    return status === 'approved';
  };

  const requiresEmailVerification = (): boolean => {
    return isAuthenticated && !isEmailVerified();
  };

  const requiresProfileCompletion = (role?: 'client' | 'consultant'): boolean => {
    return isAuthenticated && isEmailVerified() && !isProfileComplete(role);
  };

  const requiresProfileApproval = (role?: 'client' | 'consultant'): boolean => {
    return isAuthenticated && isEmailVerified() && isProfileComplete(role) && !isProfileApproved(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        getActiveRole,
        isEmailVerified,
        getProfileStatus,
        getApprovalStatus,
        getUniqueId,
        isProfileComplete,
        isProfileApproved,
        requiresEmailVerification,
        requiresProfileCompletion,
        requiresProfileApproval,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
