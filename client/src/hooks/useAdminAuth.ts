import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface AdminUser {
  user: {
    id: string;
    email: string;
    role: string;
  };
  adminRole: {
    id: string;
    role: string;
    permissions: any;
    active: boolean;
  };
}

export function useAdminAuth() {
  const [, setLocation] = useLocation();

  const {
    data: adminData,
    isLoading,
    error,
  } = useQuery<AdminUser>({
    queryKey: ['/api/admin/user'],
    retry: false,
  });

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (error || !adminData)) {
      setLocation("/admin/login");
    }
  }, [isLoading, error, adminData, setLocation]);

  return {
    admin: adminData,
    isLoading,
    isAdmin: !!adminData,
  };
}
