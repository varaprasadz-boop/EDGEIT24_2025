import { Route, Switch, Redirect } from "wouter";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminUserDetail from "@/pages/AdminUserDetail";
import AdminApprovalQueue from "@/pages/AdminApprovalQueue";
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
import AdminRefunds from "@/pages/AdminRefunds";
import AdminPaymentAnalytics from "@/pages/AdminPaymentAnalytics";
import PlatformAnalytics from "@/pages/admin/PlatformAnalytics";
import AdminSupportTickets from "@/pages/admin/AdminSupportTickets";
import AdminFeedback from "@/pages/admin/AdminFeedback";

export function AdminRouter() {
  const { admin, isLoading } = useAdminAuth();

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

  // If no admin data, useAdminAuth will redirect to login
  // So we can safely render if we get here
  if (!admin) {
    return null;
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={AdminDashboard} />
        <Route path="/users/:id" component={AdminUserDetail} />
        <Route path="/users" component={AdminUsers} />
        <Route path="/approval-queue" component={AdminApprovalQueue} />
        <Route path="/profile-approvals" component={AdminProfileApprovals} />
        <Route path="/categories" component={AdminCategories} />
        <Route path="/category-requests" component={AdminCategoryRequests} />
        <Route path="/vendor-requests" component={AdminVendorRequests} />
        <Route path="/requirements" component={AdminRequirements} />
        <Route path="/bids" component={AdminBids} />
        <Route path="/messages/:id" component={AdminConversationViewer} />
        <Route path="/messages" component={AdminMessages} />
        <Route path="/security" component={AdminSecurityDashboard} />
        <Route path="/payments" component={AdminPayments} />
        <Route path="/refunds" component={AdminRefunds} />
        <Route path="/payment-analytics" component={AdminPaymentAnalytics} />
        <Route path="/analytics" component={PlatformAnalytics} />
        <Route path="/contracts" component={AdminContracts} />
        <Route path="/subscription-plans" component={AdminSubscriptionPlans} />
        <Route path="/disputes" component={AdminDisputes} />
        <Route path="/vendors" component={AdminVendors} />
        <Route path="/settings" component={AdminSettings} />
        <Route path="/email-templates" component={AdminEmailTemplates} />
        <Route path="/content-pages" component={AdminContentPages} />
        <Route path="/footer-links" component={AdminFooterLinks} />
        <Route path="/home-sections" component={AdminHomeSections} />
        <Route path="/support-tickets" component={AdminSupportTickets} />
        <Route path="/feedback" component={AdminFeedback} />
      </Switch>
    </AdminLayout>
  );
}
