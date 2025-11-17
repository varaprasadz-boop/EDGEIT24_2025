import { createContext, useContext, ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, ClientProfile, ConsultantProfile } from "@shared/schema";

interface AuthUser extends User {
  clientProfile?: ClientProfile;
  consultantProfile?: ConsultantProfile;
}

interface AuthResponse {
  user?: AuthUser | null;
  id?: string;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  getActiveRole: () => 'client' | 'consultant' | 'both' | null;
  getSelectedRole: () => 'client' | 'consultant' | null;
  setActiveRole: (role: 'client' | 'consultant') => void;
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

const ACTIVE_ROLE_KEY = 'edgeit24_active_role';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const userOrNull = data?.user !== undefined ? data.user : (data?.id ? data as AuthUser : null);
  const user = userOrNull || undefined;
  const isAuthenticated = !!userOrNull;
  
  // State for active role with localStorage persistence
  const [selectedRole, setSelectedRole] = useState<'client' | 'consultant' | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ACTIVE_ROLE_KEY);
      return stored as 'client' | 'consultant' | null;
    }
    return null;
  });

  const login = () => {
    window.location.href = '/login';
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      window.location.href = '/';
    }
  };

  const setActiveRole = (role: 'client' | 'consultant') => {
    setSelectedRole(role);
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
  };

  // Returns the user's actual role (can be 'both' for dual-role users)
  const getActiveRole = (): 'client' | 'consultant' | 'both' | null => {
    if (!user) return null;
    return user.role as 'client' | 'consultant' | 'both' | null;
  };

  // Returns the selected role for dual-role users (never returns 'both')
  const getSelectedRole = (): 'client' | 'consultant' | null => {
    if (!user) return null;
    
    // For dual-role users, check profile availability and use selection
    if (user.role === 'both') {
      const hasClientProfile = !!user.clientProfile;
      const hasConsultantProfile = !!user.consultantProfile;
      
      // If user has selected a role and that profile exists, use it
      if (selectedRole === 'client' && hasClientProfile) return 'client';
      if (selectedRole === 'consultant' && hasConsultantProfile) return 'consultant';
      
      // Otherwise default to whichever profile exists
      if (hasClientProfile) return 'client';
      if (hasConsultantProfile) return 'consultant';
      
      // Fallback to client
      return 'client';
    }
    
    // For single-role users, return their role
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
        getSelectedRole,
        setActiveRole,
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
