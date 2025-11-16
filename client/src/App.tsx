import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRouter } from "@/components/AdminRouter";
import Home from "@/pages/Home";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import PostJob from "@/pages/PostJob";
import BrowseJobs from "@/pages/BrowseJobs";
import BrowseConsultants from "@/pages/BrowseConsultants";
import ClientProfile from "@/pages/ClientProfile";
import ConsultantProfile from "@/pages/ConsultantProfile";
import ProfileCompletion from "@/pages/ProfileCompletion";
import Profile from "@/pages/Profile";
import CategoryLanding from "@/pages/CategoryLanding";
import AdminLogin from "@/pages/AdminLogin";
import MockPaymentGateway from "@/pages/MockPaymentGateway";
import LegalPage from "@/pages/LegalPage";
import Settings from "@/pages/Settings";
import MyJobs from "@/pages/MyJobs";
import Messages from "@/pages/Messages";
import UserSecurityDashboard from "@/pages/UserSecurityDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/post-job" component={PostJob} />
      <Route path="/my-jobs" component={MyJobs} />
      <Route path="/browse-jobs" component={BrowseJobs} />
      <Route path="/browse-consultants" component={BrowseConsultants} />
      <Route path="/profile/complete" component={ProfileCompletion} />
      <Route path="/profile/client" component={ClientProfile} />
      <Route path="/profile/consultant" component={ConsultantProfile} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/security" component={UserSecurityDashboard} />
      <Route path="/messages/:conversationId?" component={Messages} />
      <Route path="/services/:slug" component={CategoryLanding} />
      <Route path="/legal/:slug" component={LegalPage} />
      <Route path="/mock-payment" component={MockPaymentGateway} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/:rest*" component={AdminRouter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
