import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ClientProfile from "@/pages/ClientProfile";
import ConsultantProfile from "@/pages/ConsultantProfile";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile/client" component={ClientProfile} />
      <Route path="/profile/consultant" component={ConsultantProfile} />
      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        {() => <Redirect to="/admin/dashboard" />}
      </Route>
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
