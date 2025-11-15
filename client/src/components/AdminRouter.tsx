import { Route, Switch, Redirect } from "wouter";
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

export function AdminRouter() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/profile-approvals" component={AdminProfileApprovals} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/vendor-requests" component={AdminVendorRequests} />
        <Route path="/admin/requirements" component={AdminRequirements} />
        <Route path="/admin/bids" component={AdminBids} />
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
