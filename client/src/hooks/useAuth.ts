import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

interface AuthUser extends User {
  clientProfile?: any;
  consultantProfile?: any;
}

interface AuthResponse {
  user?: AuthUser | null;
  // For backward compatibility with direct user response
  id?: string;
  email?: string;
}

export function useAuth() {
  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Handle both response formats: { user: ... } or direct user object
  const user = data?.user !== undefined ? data.user : (data?.id ? data as AuthUser : null);

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
