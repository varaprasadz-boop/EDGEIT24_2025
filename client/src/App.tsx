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
import Analytics from "@/pages/Analytics";
import VendorAnalytics from "@/pages/VendorAnalytics";
import ClientAnalytics from "@/pages/ClientAnalytics";
import Documents from "@/pages/Documents";
import Portfolio from "@/pages/Portfolio";
import UserSecurityDashboard from "@/pages/UserSecurityDashboard";
import Setup2FA from "@/pages/Setup2FA";
import Verify2FA from "@/pages/Verify2FA";
import ConsultantProjectsPage from "@/pages/consultant/ConsultantProjectsPage";
import ConsultantProjectDetailsPage from "@/pages/consultant/ConsultantProjectDetailsPage";
import ConsultantInvoicesPage from "@/pages/consultant/ConsultantInvoicesPage";
import CreateInvoicePage from "@/pages/consultant/CreateInvoicePage";
import InvoiceDetailPage from "@/pages/consultant/InvoiceDetailPage";
import ClientProjectsPage from "@/pages/client/ClientProjectsPage";
import ClientProjectDetailsPage from "@/pages/client/ClientProjectDetailsPage";
import ClientInvoicesPage from "@/pages/client/ClientInvoicesPage";
import ClientInvoiceDetailPage from "@/pages/client/ClientInvoiceDetailPage";
import WalletPage from "@/pages/WalletPage";
import FindProjectsPage from "@/pages/consultant/FindProjectsPage";
import SavedRequirementsPage from "@/pages/consultant/SavedRequirementsPage";
import FindConsultantsPage from "@/pages/client/FindConsultantsPage";
import VendorListsPage from "@/pages/client/VendorListsPage";
import CompareConsultantsPage from "@/pages/client/CompareConsultantsPage";
import RaiseDispute from "@/pages/RaiseDispute";
import MyDisputes from "@/pages/MyDisputes";
import HelpCenter from "@/pages/HelpCenter";
import FAQPage from "@/pages/FAQPage";
import KnowledgeBase from "@/pages/KnowledgeBase";
import ContactSupport from "@/pages/ContactSupport";
import MySupportTickets from "@/pages/MySupportTickets";
import PlatformFeedback from "@/pages/PlatformFeedback";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/verify-2fa" component={Verify2FA} />
      <Route path="/setup-2fa" component={Setup2FA} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/post-job" component={PostJob} />
      <Route path="/my-jobs" component={MyJobs} />
      <Route path="/browse-jobs" component={BrowseJobs} />
      <Route path="/browse-consultants" component={BrowseConsultants} />
      <Route path="/profile/complete" component={ProfileCompletion} />
      <Route path="/profile/client" component={ClientProfile} />
      <Route path="/client-profile" component={ClientProfile} />
      <Route path="/profile/consultant" component={ConsultantProfile} />
      <Route path="/consultant-profile" component={ConsultantProfile} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/documents" component={Documents} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/security" component={UserSecurityDashboard} />
      <Route path="/security/setup-2fa" component={Setup2FA} />
      <Route path="/messages/:conversationId?" component={Messages} />
      <Route path="/consultant/projects" component={ConsultantProjectsPage} />
      <Route path="/consultant/projects/:id" component={ConsultantProjectDetailsPage} />
      <Route path="/consultant/invoices" component={ConsultantInvoicesPage} />
      <Route path="/consultant/invoices/create" component={CreateInvoicePage} />
      <Route path="/consultant/invoices/:id" component={InvoiceDetailPage} />
      <Route path="/consultant/find-projects" component={FindProjectsPage} />
      <Route path="/consultant/saved-requirements" component={SavedRequirementsPage} />
      <Route path="/consultant/analytics" component={VendorAnalytics} />
      <Route path="/client/analytics" component={ClientAnalytics} />
      <Route path="/client/projects" component={ClientProjectsPage} />
      <Route path="/client/projects/:id" component={ClientProjectDetailsPage} />
      <Route path="/client/invoices" component={ClientInvoicesPage} />
      <Route path="/client/invoices/:id" component={ClientInvoiceDetailPage} />
      <Route path="/client/find-consultants" component={FindConsultantsPage} />
      <Route path="/client/vendor-lists" component={VendorListsPage} />
      <Route path="/client/compare-consultants" component={CompareConsultantsPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/raise-dispute" component={RaiseDispute} />
      <Route path="/my-disputes" component={MyDisputes} />
      <Route path="/help" component={HelpCenter} />
      <Route path="/help/faq" component={FAQPage} />
      <Route path="/help/knowledge-base" component={KnowledgeBase} />
      <Route path="/help/contact" component={ContactSupport} />
      <Route path="/help/my-tickets" component={MySupportTickets} />
      <Route path="/help/feedback" component={PlatformFeedback} />
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
