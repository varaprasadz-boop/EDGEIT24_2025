import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle, 
  XCircle, 
  FileEdit, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

interface ClientProfile {
  userId: string;
  companyName: string | null;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  location: string | null;
  description: string | null;
  profileStatus: string;
  approvalStatus: string;
  submittedAt: string | null;
}

interface ConsultantProfile {
  userId: string;
  fullName: string | null;
  title: string | null;
  bio: string | null;
  hourlyRate: number | null;
  yearsOfExperience: number | null;
  location: string | null;
  phone: string | null;
  education: any | null;
  certifications: string[] | null;
  skills: string[] | null;
  languages: string[] | null;
  portfolioItems: any[] | null;
  servicePackages: any[] | null;
  profileStatus: string;
  approvalStatus: string;
  submittedAt: string | null;
}

interface PendingProfile {
  user: User;
  profile: ClientProfile | ConsultantProfile;
}

interface PendingProfiles {
  clients: PendingProfile[];
  consultants: PendingProfile[];
}

type ActionType = 'approve' | 'reject' | 'request-changes';

export default function AdminProfileApprovals() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedProfile, setSelectedProfile] = useState<{
    userId: string;
    profileType: 'client' | 'consultant';
    data: PendingProfile;
  } | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch pending profiles with explicit credentials and error handling
  const { data, isLoading, error, refetch } = useQuery<PendingProfiles>({
    queryKey: ["/api/admin/profiles/pending"],
    queryFn: async () => {
      const res = await fetch('/api/admin/profiles/pending', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
      }
      return res.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ userId, profileType, notes }: { userId: string; profileType: string; notes?: string }) => {
      return apiRequest("POST", `/api/admin/profiles/${userId}/approve`, { profileType, notes });
    },
    onSuccess: () => {
      toast({
        title: "Profile Approved",
        description: "Profile has been successfully approved and unique ID assigned.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profiles/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/status"] });
      setIsDialogOpen(false);
      setSelectedProfile(null);
      setAdminNotes("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve profile. Please try again.",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, profileType, notes }: { userId: string; profileType: string; notes: string }) => {
      return apiRequest("POST", `/api/admin/profiles/${userId}/reject`, { profileType, notes });
    },
    onSuccess: () => {
      toast({
        title: "Profile Rejected",
        description: "Profile has been rejected. User will be notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profiles/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/status"] });
      setIsDialogOpen(false);
      setSelectedProfile(null);
      setAdminNotes("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject profile. Please try again.",
      });
    },
  });

  // Request changes mutation
  const requestChangesMutation = useMutation({
    mutationFn: async ({ userId, profileType, notes }: { userId: string; profileType: string; notes: string }) => {
      return apiRequest("POST", `/api/admin/profiles/${userId}/request-changes`, { profileType, notes });
    },
    onSuccess: () => {
      toast({
        title: "Changes Requested",
        description: "Change request sent. Profile moved back to draft.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profiles/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/status"] });
      setIsDialogOpen(false);
      setSelectedProfile(null);
      setAdminNotes("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to request changes. Please try again.",
      });
    },
  });

  const handleAction = (
    userId: string,
    profileType: 'client' | 'consultant',
    action: ActionType,
    data: PendingProfile
  ) => {
    setSelectedProfile({ userId, profileType, data });
    setActionType(action);
    setAdminNotes("");
    setIsDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedProfile || !actionType) return;

    const { userId, profileType } = selectedProfile;

    switch (actionType) {
      case 'approve':
        approveMutation.mutate({ userId, profileType, notes: adminNotes });
        break;
      case 'reject':
        if (!adminNotes.trim()) {
          toast({
            variant: "destructive",
            title: "Notes Required",
            description: "Please provide a reason for rejection.",
          });
          return;
        }
        rejectMutation.mutate({ userId, profileType, notes: adminNotes });
        break;
      case 'request-changes':
        if (!adminNotes.trim()) {
          toast({
            variant: "destructive",
            title: "Notes Required",
            description: "Please specify what changes are needed.",
          });
          return;
        }
        requestChangesMutation.mutate({ userId, profileType, notes: adminNotes });
        break;
    }
  };

  const renderClientProfileCard = (item: PendingProfile) => {
    const profile = item.profile as ClientProfile;
    const user = item.user;

    return (
      <Card key={user.id} className="hover-elevate" data-testid={`profile-card-${user.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {profile.companyName || 'Unnamed Company'}
              </CardTitle>
              <CardDescription className="mt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </div>
                {profile.submittedAt && (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3" />
                    Submitted {format(new Date(profile.submittedAt), 'MMM dd, yyyy')}
                  </div>
                )}
              </CardDescription>
            </div>
            <Badge variant="secondary" data-testid={`status-${user.id}`}>
              Pending Review
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Industry:</span>
              <p className="font-medium">{profile.industry || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Company Size:</span>
              <p className="font-medium">{profile.companySize || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>
              <p className="font-medium">{profile.location || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Website:</span>
              <p className="font-medium text-primary truncate">{profile.website || 'Not specified'}</p>
            </div>
          </div>

          {profile.description && (
            <div className="pt-3 border-t">
              <span className="text-sm text-muted-foreground">Description:</span>
              <p className="text-sm mt-1 line-clamp-2">{profile.description}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => approveMutation.mutate({ userId: user.id, profileType: 'client' })}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid={`button-quick-approve-${user.id}`}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => rejectMutation.mutate({ 
                userId: user.id, 
                profileType: 'client', 
                notes: 'Profile does not meet platform requirements.' 
              })}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid={`button-quick-reject-${user.id}`}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(user.id, 'client', 'request-changes', item)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid={`button-request-changes-${user.id}`}
            >
              <FileEdit className="h-4 w-4 mr-1" />
              Request Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConsultantProfileCard = (item: PendingProfile) => {
    const profile = item.profile as ConsultantProfile;
    const user = item.user;

    return (
      <Card key={user.id} className="hover-elevate" data-testid={`profile-card-${user.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {profile.fullName || 'Unnamed Consultant'}
              </CardTitle>
              <CardDescription className="mt-1 space-y-1">
                {profile.title && <p className="font-medium">{profile.title}</p>}
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </div>
                {profile.submittedAt && (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3" />
                    Submitted {format(new Date(profile.submittedAt), 'MMM dd, yyyy')}
                  </div>
                )}
              </CardDescription>
            </div>
            <Badge variant="secondary" data-testid={`status-${user.id}`}>
              Pending Review
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Experience:</span>
              <p className="font-medium">{profile.yearsOfExperience ? `${profile.yearsOfExperience} years` : 'Not specified'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Hourly Rate:</span>
              <p className="font-medium">{profile.hourlyRate ? `﷼${profile.hourlyRate}/hr` : 'Not specified'}</p>
            </div>
            {profile.location && (
              <div>
                <span className="text-muted-foreground">Location:</span>
                <p className="font-medium">{profile.location}</p>
              </div>
            )}
            {profile.phone && (
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{profile.phone}</p>
              </div>
            )}
          </div>

          {profile.skills && profile.skills.length > 0 && (
            <div className="pt-3 border-t">
              <span className="text-sm text-muted-foreground">Skills:</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.skills.slice(0, 6).map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {profile.skills.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{profile.skills.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {profile.bio && (
            <div className="pt-3 border-t">
              <span className="text-sm text-muted-foreground">Bio:</span>
              <p className="text-sm mt-1 line-clamp-2">{profile.bio}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => approveMutation.mutate({ userId: user.id, profileType: 'consultant' })}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid={`button-quick-approve-${user.id}`}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => rejectMutation.mutate({ 
                userId: user.id, 
                profileType: 'consultant', 
                notes: 'Profile does not meet platform requirements.' 
              })}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid={`button-quick-reject-${user.id}`}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(user.id, 'consultant', 'request-changes', item)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid={`button-request-changes-${user.id}`}
            >
              <FileEdit className="h-4 w-4 mr-1" />
              Request Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Profile Approvals
          </h1>
          <p className="text-muted-foreground">
            Review and approve pending client and consultant profiles
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 p-6">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Failed to load pending profiles</p>
                <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
              </div>
              <Button onClick={() => refetch()} className="ml-auto" data-testid="button-retry">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {data && !isLoading && (
          <Tabs defaultValue="clients" className="space-y-4">
            <TabsList>
              <TabsTrigger value="clients" data-testid="tab-clients">
                Clients ({data.clients.length})
              </TabsTrigger>
              <TabsTrigger value="consultants" data-testid="tab-consultants">
                Consultants ({data.consultants.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clients" className="space-y-4">
              {data.clients.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-lg font-medium">No pending client profiles</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All client profiles have been reviewed
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.clients.map(renderClientProfileCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="consultants" className="space-y-4">
              {data.consultants.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-lg font-medium">No pending consultant profiles</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All consultant profiles have been reviewed
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.consultants.map(renderConsultantProfileCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Action Confirmation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent data-testid="dialog-confirm-action">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' && 'Approve Profile'}
                {actionType === 'reject' && 'Reject Profile'}
                {actionType === 'request-changes' && 'Request Changes'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' && 'This will approve the profile and assign a unique ID. The user will be notified.'}
                {actionType === 'reject' && 'This will reject the profile. Please provide a reason for rejection.'}
                {actionType === 'request-changes' && 'This will move the profile back to draft status. Please specify what changes are needed.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="admin-notes">
                  {actionType === 'approve' ? 'Notes (Optional)' : 'Notes (Required)'}
                </Label>
                <Textarea
                  id="admin-notes"
                  placeholder={
                    actionType === 'approve' 
                      ? 'Add any notes for internal records...'
                      : actionType === 'reject'
                      ? 'Explain why this profile is being rejected...'
                      : 'Specify what changes need to be made...'
                  }
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  data-testid="input-admin-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                disabled={approveMutation.isPending || rejectMutation.isPending || requestChangesMutation.isPending}
                data-testid="button-confirm"
              >
                {(approveMutation.isPending || rejectMutation.isPending || requestChangesMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
