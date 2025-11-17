import { useState, useEffect } from "react";
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock, Bell } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { NOTIFICATION_TYPES } from "@shared/schema";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

type NotificationPreferences = {
  id: string;
  userId: string;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  emailEnabledTypes: string[] | null;
  inAppEnabledTypes: string[] | null;
};

// Friendly names for notification types
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  [NOTIFICATION_TYPES.BID_RECEIVED]: 'New bid received',
  [NOTIFICATION_TYPES.BID_STATUS_UPDATE]: 'Bid status updated',
  [NOTIFICATION_TYPES.BID_AWARDED]: 'Bid awarded',
  [NOTIFICATION_TYPES.BID_REJECTED]: 'Bid rejected',
  [NOTIFICATION_TYPES.PAYMENT_DEPOSITED]: 'Payment deposited',
  [NOTIFICATION_TYPES.PAYMENT_RELEASED]: 'Payment released',
  [NOTIFICATION_TYPES.PROJECT_STATUS_CHANGE]: 'Project status changed',
  [NOTIFICATION_TYPES.MILESTONE_COMPLETED]: 'Milestone completed',
  [NOTIFICATION_TYPES.DELIVERABLE_SUBMITTED]: 'Deliverable submitted',
  [NOTIFICATION_TYPES.INVOICE_GENERATED]: 'Invoice generated',
  [NOTIFICATION_TYPES.VENDOR_INVITED]: 'Invited to bid on project',
  [NOTIFICATION_TYPES.VERIFICATION_STATUS]: 'Verification status updated',
  [NOTIFICATION_TYPES.CATEGORY_APPROVAL]: 'Category access approved',
  [NOTIFICATION_TYPES.NEW_MESSAGE]: 'New message',
  [NOTIFICATION_TYPES.REVIEW_RECEIVED]: 'Review received',
  [NOTIFICATION_TYPES.REVIEW_RESPONSE]: 'Review response',
  [NOTIFICATION_TYPES.DEADLINE_REMINDER]: 'Deadline reminder',
  [NOTIFICATION_TYPES.REFUND_PROCESSED]: 'Refund processed',
  [NOTIFICATION_TYPES.TEAM_MEMBER_ACTIVITY]: 'Team member activity',
};

const CRITICAL_TYPES = [
  NOTIFICATION_TYPES.BID_RECEIVED,
  NOTIFICATION_TYPES.BID_STATUS_UPDATE,
  NOTIFICATION_TYPES.BID_AWARDED,
  NOTIFICATION_TYPES.BID_REJECTED,
  NOTIFICATION_TYPES.PAYMENT_DEPOSITED,
  NOTIFICATION_TYPES.PAYMENT_RELEASED,
  NOTIFICATION_TYPES.PROJECT_STATUS_CHANGE,
  NOTIFICATION_TYPES.MILESTONE_COMPLETED,
  NOTIFICATION_TYPES.DELIVERABLE_SUBMITTED,
  NOTIFICATION_TYPES.INVOICE_GENERATED,
  NOTIFICATION_TYPES.VENDOR_INVITED,
  NOTIFICATION_TYPES.VERIFICATION_STATUS,
  NOTIFICATION_TYPES.CATEGORY_APPROVAL,
];

const IMPORTANT_TYPES = [
  NOTIFICATION_TYPES.NEW_MESSAGE,
  NOTIFICATION_TYPES.REVIEW_RECEIVED,
  NOTIFICATION_TYPES.REVIEW_RESPONSE,
  NOTIFICATION_TYPES.DEADLINE_REMINDER,
  NOTIFICATION_TYPES.REFUND_PROCESSED,
  NOTIFICATION_TYPES.TEAM_MEMBER_ACTIVITY,
];

export default function Settings() {
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "account");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notification-preferences'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/notification-preferences');
      return res.json();
    },
    enabled: activeTab === 'notifications',
  });

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailTypes, setEmailTypes] = useState<string[] | null>(null);
  const [inAppTypes, setInAppTypes] = useState<string[] | null>(null);

  useEffect(() => {
    if (preferences) {
      setEmailEnabled(preferences.emailNotificationsEnabled);
      setInAppEnabled(preferences.inAppNotificationsEnabled);
      setEmailTypes(preferences.emailEnabledTypes);
      setInAppTypes(preferences.inAppEnabledTypes);
    }
  }, [preferences]);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('POST', '/api/auth/change-password', data);
      const body = await res.json();
      return body;
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { 
      emailNotificationsEnabled?: boolean; 
      inAppNotificationsEnabled?: boolean;
      emailEnabledTypes?: string[] | null;
      inAppEnabledTypes?: string[] | null;
    }) => {
      await apiRequest('PUT', '/api/notification-preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update notification preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleEmailToggle = (checked: boolean) => {
    setEmailEnabled(checked);
    updatePreferencesMutation.mutate({ emailNotificationsEnabled: checked });
  };

  const handleInAppToggle = (checked: boolean) => {
    setInAppEnabled(checked);
    updatePreferencesMutation.mutate({ inAppNotificationsEnabled: checked });
  };

  const handleEmailTypeToggle = (type: string, checked: boolean) => {
    const newTypes = emailTypes === null 
      ? (checked ? [type] : Object.values(NOTIFICATION_TYPES).filter(t => t !== type))
      : checked 
        ? [...emailTypes, type]
        : emailTypes.filter(t => t !== type);
    
    setEmailTypes(newTypes.length === Object.values(NOTIFICATION_TYPES).length ? null : newTypes);
    updatePreferencesMutation.mutate({ emailEnabledTypes: newTypes.length === Object.values(NOTIFICATION_TYPES).length ? null : newTypes });
  };

  const handleInAppTypeToggle = (type: string, checked: boolean) => {
    const newTypes = inAppTypes === null 
      ? (checked ? [type] : Object.values(NOTIFICATION_TYPES).filter(t => t !== type))
      : checked 
        ? [...inAppTypes, type]
        : inAppTypes.filter(t => t !== type);
    
    setInAppTypes(newTypes.length === Object.values(NOTIFICATION_TYPES).length ? null : newTypes);
    updatePreferencesMutation.mutate({ inAppEnabledTypes: newTypes.length === Object.values(NOTIFICATION_TYPES).length ? null : newTypes });
  };

  const isEmailTypeEnabled = (type: string) => {
    return emailTypes === null || emailTypes.includes(type);
  };

  const isInAppTypeEnabled = (type: string) => {
    return inAppTypes === null || inAppTypes.includes(type);
  };

  return (
    <UserLayout>
      <div className="container max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground" data-testid="text-settings-subtitle">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-settings">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="account" data-testid="tab-account">
              <Lock className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-6">
            <Card data-testid="card-change-password">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your current password"
                              autoComplete="current-password"
                              data-testid="input-current-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter new password (min. 6 characters)"
                              autoComplete="new-password"
                              data-testid="input-new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your new password"
                              autoComplete="new-password"
                              data-testid="input-confirm-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-save-password"
                      >
                        {changePasswordMutation.isPending ? "Saving..." : "Change Password"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card data-testid="card-notification-preferences">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {preferencesLoading ? (
                  <div className="text-sm text-muted-foreground">Loading preferences...</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between" data-testid="preference-email">
                      <div className="space-y-1">
                        <Label htmlFor="email-notifications" className="text-base">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={emailEnabled}
                        onCheckedChange={handleEmailToggle}
                        disabled={updatePreferencesMutation.isPending}
                        data-testid="switch-email-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between" data-testid="preference-in-app">
                      <div className="space-y-1">
                        <Label htmlFor="in-app-notifications" className="text-base">
                          In-App Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Show notifications in the application
                        </p>
                      </div>
                      <Switch
                        id="in-app-notifications"
                        checked={inAppEnabled}
                        onCheckedChange={handleInAppToggle}
                        disabled={updatePreferencesMutation.isPending}
                        data-testid="switch-in-app-notifications"
                      />
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold mb-4">Critical Business Events</h3>
                        <div className="space-y-4">
                          {CRITICAL_TYPES.map((type) => (
                            <div key={type} className="flex items-start justify-between gap-4" data-testid={`preference-type-${type}`}>
                              <div className="flex-1 min-w-0">
                                <Label className="text-sm font-medium">
                                  {NOTIFICATION_TYPE_LABELS[type]}
                                </Label>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`email-${type}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    Email
                                  </Label>
                                  <Switch
                                    id={`email-${type}`}
                                    checked={isEmailTypeEnabled(type)}
                                    onCheckedChange={(checked) => handleEmailTypeToggle(type, checked)}
                                    disabled={!emailEnabled || updatePreferencesMutation.isPending}
                                    data-testid={`switch-email-${type}`}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`inapp-${type}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    In-App
                                  </Label>
                                  <Switch
                                    id={`inapp-${type}`}
                                    checked={isInAppTypeEnabled(type)}
                                    onCheckedChange={(checked) => handleInAppTypeToggle(type, checked)}
                                    disabled={!inAppEnabled || updatePreferencesMutation.isPending}
                                    data-testid={`switch-inapp-${type}`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-base font-semibold mb-4">Important Value-Add Features</h3>
                        <div className="space-y-4">
                          {IMPORTANT_TYPES.map((type) => (
                            <div key={type} className="flex items-start justify-between gap-4" data-testid={`preference-type-${type}`}>
                              <div className="flex-1 min-w-0">
                                <Label className="text-sm font-medium">
                                  {NOTIFICATION_TYPE_LABELS[type]}
                                </Label>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`email-${type}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    Email
                                  </Label>
                                  <Switch
                                    id={`email-${type}`}
                                    checked={isEmailTypeEnabled(type)}
                                    onCheckedChange={(checked) => handleEmailTypeToggle(type, checked)}
                                    disabled={!emailEnabled || updatePreferencesMutation.isPending}
                                    data-testid={`switch-email-${type}`}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`inapp-${type}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    In-App
                                  </Label>
                                  <Switch
                                    id={`inapp-${type}`}
                                    checked={isInAppTypeEnabled(type)}
                                    onCheckedChange={(checked) => handleInAppTypeToggle(type, checked)}
                                    disabled={!inAppEnabled || updatePreferencesMutation.isPending}
                                    data-testid={`switch-inapp-${type}`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
}
