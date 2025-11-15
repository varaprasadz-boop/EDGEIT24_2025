import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderTree,
  UserCog,
  FileText,
  MessageSquare,
  Star,
  Bell,
  FileSignature,
  CreditCard,
  RotateCcw,
  Scale,
  Activity,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Layers,
  Mail,
  CheckCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { apiRequest } from "@/lib/queryClient";

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
} as React.CSSProperties;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(i18n.language === 'ar');

  // Listen for language changes to update RTL state
  useEffect(() => {
    setIsRTL(i18n.language === 'ar');
  }, [i18n.language]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navGroups = [
    {
      label: t('sidebar.overview'),
      items: [
        {
          title: t('sidebar.dashboard'),
          url: '/admin/dashboard',
          icon: LayoutDashboard,
          testId: 'nav-dashboard',
        },
      ],
    },
    {
      label: t('sidebar.operations'),
      items: [
        {
          title: t('sidebar.users'),
          url: '/admin/users',
          icon: Users,
          testId: 'nav-users',
        },
        {
          title: 'Profile Approvals',
          url: '/admin/profile-approvals',
          icon: CheckCircle,
          testId: 'nav-profile-approvals',
        },
        {
          title: t('sidebar.vendorDirectory'),
          url: '/admin/vendors',
          icon: UserCheck,
          testId: 'nav-vendors',
        },
        {
          title: t('sidebar.categories'),
          url: '/admin/categories',
          icon: FolderTree,
          testId: 'nav-categories',
        },
        {
          title: t('sidebar.vendorRequests'),
          url: '/admin/vendor-requests',
          icon: UserCog,
          testId: 'nav-vendor-requests',
        },
        {
          title: t('sidebar.requirements'),
          url: '/admin/requirements',
          icon: FileText,
          testId: 'nav-requirements',
        },
        {
          title: t('sidebar.bids'),
          url: '/admin/bids',
          icon: MessageSquare,
          testId: 'nav-bids',
        },
        {
          title: t('sidebar.messages'),
          url: '/admin/messages',
          icon: MessageSquare,
          testId: 'nav-messages',
        },
        {
          title: t('sidebar.reviews'),
          url: '/admin/reviews',
          icon: Star,
          testId: 'nav-reviews',
        },
        {
          title: t('sidebar.notifications'),
          url: '/admin/notifications',
          icon: Bell,
          testId: 'nav-notifications',
        },
      ],
    },
    {
      label: t('sidebar.finance'),
      items: [
        {
          title: t('sidebar.subscriptionPlans'),
          url: '/admin/subscription-plans',
          icon: Layers,
          testId: 'nav-subscription-plans',
        },
        {
          title: t('sidebar.contracts'),
          url: '/admin/contracts',
          icon: FileSignature,
          testId: 'nav-contracts',
        },
        {
          title: t('sidebar.payments'),
          url: '/admin/payments',
          icon: CreditCard,
          testId: 'nav-payments',
        },
        {
          title: t('sidebar.refunds'),
          url: '/admin/refunds',
          icon: RotateCcw,
          testId: 'nav-refunds',
        },
      ],
    },
    {
      label: t('sidebar.system'),
      items: [
        {
          title: t('sidebar.disputes'),
          url: '/admin/disputes',
          icon: Scale,
          testId: 'nav-disputes',
        },
        {
          title: t('sidebar.activityLogs'),
          url: '/admin/activity-logs',
          icon: Activity,
          testId: 'nav-activity-logs',
        },
        {
          title: t('sidebar.analytics'),
          url: '/admin/analytics',
          icon: BarChart3,
          testId: 'nav-analytics',
        },
        {
          title: t('sidebar.settings'),
          url: '/admin/settings',
          icon: Settings,
          testId: 'nav-settings',
        },
        {
          title: t('sidebar.emailTemplates'),
          url: '/admin/email-templates',
          icon: Mail,
          testId: 'nav-email-templates',
        },
        {
          title: t('sidebar.rolesPermissions'),
          url: '/admin/roles',
          icon: Shield,
          testId: 'nav-roles',
        },
      ],
    },
  ];

  return (
    <SidebarProvider defaultOpen={true} style={sidebarStyle}>
      <div className={`flex h-screen w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Sidebar collapsible="offcanvas">
          <SidebarHeader className="border-b px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold">EDGEIT24</h2>
                <p className="text-xs text-muted-foreground">{t('sidebar.system')}</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.url}
                          data-testid={item.testId}
                        >
                          <a href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
              data-testid="button-sidebar-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-end gap-4 p-4 border-b">
            <LanguageSwitcher />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
