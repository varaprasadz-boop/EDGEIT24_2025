import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  User,
  Briefcase,
  FileText,
  Search,
  MessageSquare,
  Settings,
  LogOut,
  FolderKanban,
  Users,
  PlusCircle,
  RefreshCw,
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/contexts/AuthContext";
import logoUrl from "@assets/image_1762432763578.png";

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
} as React.CSSProperties;

interface UserLayoutProps {
  children: React.ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout, getSelectedRole, setActiveRole } = useAuthContext();
  const selectedRole = getSelectedRole();

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const getUserDisplayName = () => {
    if (!user) return "User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  // Client navigation items
  const clientNavGroups = [
    {
      label: "Main",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
          testId: "nav-dashboard",
        },
        {
          title: "Profile",
          url: "/profile/client",
          icon: User,
          testId: "nav-profile",
        },
      ],
    },
    {
      label: "Jobs & Projects",
      items: [
        {
          title: "Post New Job",
          url: "/post-job",
          icon: PlusCircle,
          testId: "nav-post-job",
        },
        {
          title: "My Jobs",
          url: "/my-jobs",
          icon: Briefcase,
          testId: "nav-my-jobs",
        },
        {
          title: "My Projects",
          url: "/client/projects",
          icon: FolderKanban,
          testId: "nav-my-projects",
        },
        {
          title: "Browse Consultants",
          url: "/browse-consultants",
          icon: Users,
          testId: "nav-browse-consultants",
        },
      ],
    },
    {
      label: "Communication",
      items: [
        {
          title: "Messages",
          url: "/messages",
          icon: MessageSquare,
          testId: "nav-messages",
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          title: "Settings",
          url: "/settings",
          icon: Settings,
          testId: "nav-settings",
        },
      ],
    },
  ];

  // Consultant navigation items
  const consultantNavGroups = [
    {
      label: "Main",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
          testId: "nav-dashboard",
        },
        {
          title: "Profile",
          url: "/profile/consultant",
          icon: User,
          testId: "nav-profile",
        },
      ],
    },
    {
      label: "Work",
      items: [
        {
          title: "Browse Jobs",
          url: "/browse-jobs",
          icon: Search,
          testId: "nav-browse-jobs",
        },
        {
          title: "My Bids",
          url: "/my-bids",
          icon: FileText,
          testId: "nav-my-bids",
        },
        {
          title: "My Projects",
          url: "/consultant/projects",
          icon: FolderKanban,
          testId: "nav-my-projects",
        },
      ],
    },
    {
      label: "Communication",
      items: [
        {
          title: "Messages",
          url: "/messages",
          icon: MessageSquare,
          testId: "nav-messages",
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          title: "Settings",
          url: "/settings",
          icon: Settings,
          testId: "nav-settings",
        },
      ],
    },
  ];

  // Select navigation based on selected role
  // For dual-role users, show only the selected role's navigation
  const navGroups = selectedRole === "consultant" 
    ? consultantNavGroups
    : clientNavGroups; // Default to client
  
  // Show role switcher if user has both roles
  const showRoleSwitcher = user?.role === "both";
  
  const handleSwitchRole = () => {
    const newRole = selectedRole === "client" ? "consultant" : "client";
    setActiveRole(newRole);
    setLocation("/dashboard");
  };

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt="EDGEIT24" className="h-8" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group, groupIndex) => (
              <SidebarGroup key={groupIndex}>
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
                          <a href={item.url} className="flex items-center gap-2">
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

          <SidebarFooter className="border-t border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid="text-user-name">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
                  {user?.email}
                </p>
              </div>
            </div>
            {showRoleSwitcher && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchRole}
                className="w-full mb-2"
                data-testid="button-switch-role"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Switch to {selectedRole === "client" ? "Consultant" : "Client"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
