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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  const login = () => {
    window.location.href = '/api/login';
  };

  const logout = () => {
    window.location.href = '/api/logout';
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        getActiveRole,
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
