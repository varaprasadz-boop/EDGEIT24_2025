import { useLocation, Link } from "wouter";
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
  Link as LinkIcon,
  LayoutGrid,
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
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/image_1762432763578.png";

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
          url: '/dashboard',
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
          url: '/users',
          icon: Users,
          testId: 'nav-users',
        },
        {
          title: 'Profile Approvals',
          url: '/profile-approvals',
          icon: CheckCircle,
          testId: 'nav-profile-approvals',
        },
        {
          title: t('sidebar.vendorDirectory'),
          url: '/vendors',
          icon: UserCheck,
          testId: 'nav-vendors',
        },
        {
          title: t('sidebar.categories'),
          url: '/categories',
          icon: FolderTree,
          testId: 'nav-categories',
        },
        {
          title: 'Category Requests',
          url: '/category-requests',
          icon: CheckCircle,
          testId: 'nav-category-requests',
        },
        {
          title: t('sidebar.vendorRequests'),
          url: '/vendor-requests',
          icon: UserCog,
          testId: 'nav-vendor-requests',
        },
        {
          title: t('sidebar.requirements'),
          url: '/requirements',
          icon: FileText,
          testId: 'nav-requirements',
        },
        {
          title: t('sidebar.bids'),
          url: '/bids',
          icon: MessageSquare,
          testId: 'nav-bids',
        },
        {
          title: t('sidebar.messages'),
          url: '/messages',
          icon: MessageSquare,
          testId: 'nav-messages',
        },
        {
          title: t('sidebar.reviews'),
          url: '/reviews',
          icon: Star,
          testId: 'nav-reviews',
        },
        {
          title: t('sidebar.notifications'),
          url: '/notifications',
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
          url: '/subscription-plans',
          icon: Layers,
          testId: 'nav-subscription-plans',
        },
        {
          title: t('sidebar.contracts'),
          url: '/contracts',
          icon: FileSignature,
          testId: 'nav-contracts',
        },
        {
          title: t('sidebar.payments'),
          url: '/payments',
          icon: CreditCard,
          testId: 'nav-payments',
        },
        {
          title: t('sidebar.refunds'),
          url: '/refunds',
          icon: RotateCcw,
          testId: 'nav-refunds',
        },
      ],
    },
    {
      label: 'Content Management',
      items: [
        {
          title: 'Content Pages',
          url: '/content-pages',
          icon: FileText,
          testId: 'nav-content-pages',
        },
        {
          title: 'Footer Links',
          url: '/footer-links',
          icon: LinkIcon,
          testId: 'nav-footer-links',
        },
        {
          title: 'Home Sections',
          url: '/home-sections',
          icon: LayoutGrid,
          testId: 'nav-home-sections',
        },
      ],
    },
    {
      label: t('sidebar.system'),
      items: [
        {
          title: t('sidebar.disputes'),
          url: '/disputes',
          icon: Scale,
          testId: 'nav-disputes',
        },
        {
          title: 'Security Dashboard',
          url: '/security',
          icon: Shield,
          testId: 'nav-security',
        },
        {
          title: t('sidebar.activityLogs'),
          url: '/activity-logs',
          icon: Activity,
          testId: 'nav-activity-logs',
        },
        {
          title: t('sidebar.analytics'),
          url: '/analytics',
          icon: BarChart3,
          testId: 'nav-analytics',
        },
        {
          title: t('sidebar.settings'),
          url: '/settings',
          icon: Settings,
          testId: 'nav-settings',
        },
        {
          title: t('sidebar.emailTemplates'),
          url: '/email-templates',
          icon: Mail,
          testId: 'nav-email-templates',
        },
        {
          title: t('sidebar.rolesPermissions'),
          url: '/roles',
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
          <SidebarHeader className="bg-[#0A0E27] border-b px-4 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center">
                <img src={logoUrl} alt="EDGEIT24" className="h-8" />
              </div>
              <div className="text-xs">
                <span className="text-white/70">Logged in as:</span>
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-md font-medium ml-2">
                  Superadmin
                </span>
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
                          isActive={location === `/admin${item.url}`}
                          data-testid={item.testId}
                        >
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
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
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
