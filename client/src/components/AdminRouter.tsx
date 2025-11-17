import { Route, Switch, Redirect, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminProfileApprovals from "@/pages/AdminProfileApprovals";
import AdminCategories from "@/pages/AdminCategories";
import AdminVendorRequests from "@/pages/AdminVendorRequests";
import AdminRequirements from "@/pages/AdminRequirements";
import AdminBids from "@/pages/AdminBids";
import AdminPayments from "@/pages/AdminPayments";
import AdminContracts from "@/pages/AdminContracts";
import AdminSubscriptionPlans from "@/pages/AdminSubscriptionPlans";
import AdminDisputes from "@/pages/AdminDisputes";
import AdminVendors from "@/pages/AdminVendors";
import AdminSettings from "@/pages/AdminSettings";
import AdminEmailTemplates from "@/pages/AdminEmailTemplates";
import AdminContentPages from "@/pages/admin/AdminContentPages";
import AdminFooterLinks from "@/pages/admin/AdminFooterLinks";
import AdminHomeSections from "@/pages/admin/AdminHomeSections";
import AdminMessages from "@/pages/AdminMessages";
import AdminConversationViewer from "@/pages/AdminConversationViewer";
import AdminSecurityDashboard from "@/pages/AdminSecurityDashboard";
import AdminCategoryRequests from "@/pages/AdminCategoryRequests";

export function AdminRouter() {
  const { user, isLoading } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Block non-admin users from accessing admin routes
  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin area.",
        variant: "destructive",
      });
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation, toast]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Block access if not admin
  if (!user || user.role !== 'admin') {
    return null; // Will redirect via useEffect
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/profile-approvals" component={AdminProfileApprovals} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/category-requests" component={AdminCategoryRequests} />
        <Route path="/admin/vendor-requests" component={AdminVendorRequests} />
        <Route path="/admin/requirements" component={AdminRequirements} />
        <Route path="/admin/bids" component={AdminBids} />
        <Route path="/admin/messages/:id" component={AdminConversationViewer} />
        <Route path="/admin/messages" component={AdminMessages} />
        <Route path="/admin/security" component={AdminSecurityDashboard} />
        <Route path="/admin/payments" component={AdminPayments} />
        <Route path="/admin/contracts" component={AdminContracts} />
        <Route path="/admin/subscription-plans" component={AdminSubscriptionPlans} />
        <Route path="/admin/disputes" component={AdminDisputes} />
        <Route path="/admin/vendors" component={AdminVendors} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/email-templates" component={AdminEmailTemplates} />
        <Route path="/admin/content-pages" component={AdminContentPages} />
        <Route path="/admin/footer-links" component={AdminFooterLinks} />
        <Route path="/admin/home-sections" component={AdminHomeSections} />
      </Switch>
    </AdminLayout>
  );
}
