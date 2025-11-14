import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Shield, Users, Briefcase, FileText, MessageSquare, DollarSign, CheckCircle, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useTranslation } from "react-i18next";

interface AdminStats {
  totalUsers: number;
  totalClients: number;
  totalConsultants: number;
  activeRequirements: number;
  totalBids: number;
  completedProjects: number;
  totalGMV: string;
  currency: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  // Protect admin route - redirects to login if not admin
  const { admin, isLoading: isAdminLoading } = useAdminAuth();

  const { data: stats, isLoading: isStatsLoading, error } = useQuery<AdminStats>({
    queryKey: ['/api/admin/dashboard/stats'],
    enabled: !!admin, // Only fetch stats if admin is authenticated
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Show loading while checking admin auth
  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">Failed to load dashboard</p>
            <Button className="w-full mt-4" onClick={() => setLocation("/admin/login")}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">EDGEIT24 Admin</h1>
                <p className="text-sm text-muted-foreground">Super Admin Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('auth.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">{t('dashboard.platformOverview')}</h2>
          <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
        </div>

        {/* Stats Grid */}
        {isStatsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <Card className="hover-elevate" data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalUsers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-users">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
              </CardContent>
            </Card>

            {/* Total Clients */}
            <Card className="hover-elevate" data-testid="card-total-clients">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalClients')}</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-clients">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground mt-1">Business accounts</p>
              </CardContent>
            </Card>

            {/* Total Consultants */}
            <Card className="hover-elevate" data-testid="card-total-consultants">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalConsultants')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-consultants">{stats.totalConsultants}</div>
                <p className="text-xs text-muted-foreground mt-1">Service providers</p>
              </CardContent>
            </Card>

            {/* Active Requirements */}
            <Card className="hover-elevate" data-testid="card-active-requirements">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.activeRequirements')}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-active-requirements">{stats.activeRequirements}</div>
                <p className="text-xs text-muted-foreground mt-1">Open job postings</p>
              </CardContent>
            </Card>

            {/* Total Bids */}
            <Card className="hover-elevate" data-testid="card-total-bids">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalBids')}</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-bids">{stats.totalBids}</div>
                <p className="text-xs text-muted-foreground mt-1">Proposals submitted</p>
              </CardContent>
            </Card>

            {/* Completed Projects */}
            <Card className="hover-elevate" data-testid="card-completed-projects">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.completedProjects')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-completed-projects">{stats.completedProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">Successfully closed</p>
              </CardContent>
            </Card>

            {/* Total GMV */}
            <Card className="hover-elevate col-span-1 md:col-span-2" data-testid="card-total-gmv">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalGMV')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-gmv">
                  {parseFloat(stats.totalGMV).toLocaleString()} {stats.currency}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Gross Merchandise Value</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="w-full justify-start" variant="outline" data-testid="button-manage-users">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
            <Button className="w-full justify-start" variant="outline" data-testid="button-manage-categories">
              <Briefcase className="mr-2 h-4 w-4" />
              Manage Categories
            </Button>
            <Button className="w-full justify-start" variant="outline" data-testid="button-view-requirements">
              <FileText className="mr-2 h-4 w-4" />
              View Requirements
            </Button>
            <Button className="w-full justify-start" variant="outline" data-testid="button-view-payments">
              <DollarSign className="mr-2 h-4 w-4" />
              View Payments
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
