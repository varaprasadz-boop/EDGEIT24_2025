import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

interface AuthUser extends User {
  clientProfile?: any;
  consultantProfile?: any;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Treat 401 as unauthenticated, not an error
    throwOnError: (error: any) => {
      return !/^401:/.test(error.message);
    },
  });

  // If we have a 401 error, treat as unauthenticated
  const is401 = error && /^401:/.test((error as Error).message);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !is401,
  };
}
