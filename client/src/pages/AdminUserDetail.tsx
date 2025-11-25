import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft,
  Mail, 
  User, 
  MapPin, 
  Calendar,
  Building2,
  Briefcase,
  Phone,
  Globe,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface UserDetail {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  createdAt: string;
  clientProfile: any | null;
  consultantProfile: any | null;
  approvalStatus: string;
  profileStatus: string;
  profileCompletion: number;
  kycDocuments: any[];
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    profileType: 'client' | 'consultant' | null;
  }>({
    open: false,
    action: 'approve',
    profileType: null,
  });
  const [adminNotes, setAdminNotes] = useState("");

  const { data: user, isLoading, error } = useQuery<UserDetail>({
    queryKey: ["/api/admin/users", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${id}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error("Failed to fetch user details");
      }
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch banking information for consultant (admin endpoint)
  const { data: bankingData } = useQuery<{ bankInfo: any | null }>({
    queryKey: ["/api/admin/consultants", user?.consultantProfile?.id, "banking"],
    queryFn: async () => {
      if (!user?.consultantProfile?.id) return { bankInfo: null };
      const res = await fetch(`/api/admin/consultants/${user.consultantProfile.id}/banking`, { 
        credentials: 'include' 
      });
      if (!res.ok) return { bankInfo: null };
      return res.json();
    },
    enabled: !!id && !!user?.consultantProfile?.id,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, profileType, notes }: { userId: string; profileType: string; notes: string }) => {
      return apiRequest('POST', `/api/admin/profiles/${userId}/approve`, { profileType, notes });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users", id] });
      toast({
        title: "Profile Approved",
        description: "The profile has been approved successfully.",
      });
      setApprovalDialog({ open: false, action: 'approve', profileType: null });
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve profile",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, profileType, notes }: { userId: string; profileType: string; notes: string }) => {
      return apiRequest('POST', `/api/admin/profiles/${userId}/reject`, { profileType, notes });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users", id] });
      toast({
        title: "Profile Rejected",
        description: "The profile has been rejected.",
      });
      setApprovalDialog({ open: false, action: 'approve', profileType: null });
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject profile",
        variant: "destructive",
      });
    },
  });

  const handleApprovalAction = () => {
    if (!id || !approvalDialog.profileType) return;

    if (approvalDialog.action === 'reject' && !adminNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    if (approvalDialog.action === 'approve') {
      approveMutation.mutate({ 
        userId: id, 
        profileType: approvalDialog.profileType, 
        notes: adminNotes 
      });
    } else {
      rejectMutation.mutate({ 
        userId: id, 
        profileType: approvalDialog.profileType, 
        notes: adminNotes 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h3 className="text-lg font-semibold">User Not Found</h3>
              <p className="text-sm text-muted-foreground">
                The user you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button
                variant="outline"
                onClick={() => setLocation("/users")}
                className="mt-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.lastName || "No name provided";

  const profile = user.clientProfile || user.consultantProfile;

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/users")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl flex items-center gap-3">
                  {fullName}
                  <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'client' ? 'secondary' : 'default'}>
                    {user.role}
                  </Badge>
                  <Badge variant={user.status === 'active' ? 'default' : 'outline'}>
                    {user.status}
                  </Badge>
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Joined</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Profile Completion</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={user.profileCompletion} className="h-2 w-24" />
                    <span className="text-sm text-muted-foreground">{user.profileCompletion}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Status</CardTitle>
            <CardDescription>
              Current status of the user's profile and approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Profile Status</p>
                <Badge variant={
                  user.profileStatus === 'complete' ? 'default' :
                  user.profileStatus === 'submitted' || user.profileStatus === 'under_review' ? 'secondary' :
                  'outline'
                }>
                  {user.profileStatus === 'draft' && 'Draft'}
                  {user.profileStatus === 'submitted' && 'Submitted'}
                  {user.profileStatus === 'under_review' && 'Under Review'}
                  {user.profileStatus === 'complete' && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Complete
                    </span>
                  )}
                  {user.profileStatus === 'incomplete' && 'Incomplete'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Approval Status</p>
                <Badge variant={
                  user.approvalStatus === 'approved' ? 'default' :
                  user.approvalStatus === 'rejected' ? 'destructive' :
                  'outline'
                }>
                  {user.approvalStatus === 'pending' && 'Pending'}
                  {user.approvalStatus === 'approved' && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </span>
                  )}
                  {user.approvalStatus === 'rejected' && (
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Rejected
                    </span>
                  )}
                  {user.approvalStatus === 'changes_requested' && 'Changes Requested'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Profile */}
        {user.clientProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Client Profile</CardTitle>
              </div>
              <CardDescription>Business information and company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.clientProfile.companyName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                    <p className="text-sm mt-1">{user.clientProfile.companyName}</p>
                  </div>
                )}
                {user.clientProfile.industry && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Industry</p>
                    <p className="text-sm mt-1">{user.clientProfile.industry}</p>
                  </div>
                )}
                {user.clientProfile.companySize && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Size</p>
                    <p className="text-sm mt-1">{user.clientProfile.companySize}</p>
                  </div>
                )}
                {user.clientProfile.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-sm mt-1">{user.clientProfile.location}</p>
                  </div>
                )}
                {user.clientProfile.website && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Website</p>
                    <p className="text-sm mt-1">
                      <a href={user.clientProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {user.clientProfile.website}
                      </a>
                    </p>
                  </div>
                )}
              </div>
              {user.clientProfile.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{user.clientProfile.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Consultant Profile */}
        {user.consultantProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <CardTitle>Consultant Profile</CardTitle>
              </div>
              <CardDescription>Professional information and expertise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.consultantProfile.fullName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-sm mt-1">{user.consultantProfile.fullName}</p>
                  </div>
                )}
                {user.consultantProfile.title && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Title</p>
                    <p className="text-sm mt-1">{user.consultantProfile.title}</p>
                  </div>
                )}
                {user.consultantProfile.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-sm mt-1">{user.consultantProfile.location}</p>
                  </div>
                )}
                {user.consultantProfile.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm mt-1">{user.consultantProfile.phone}</p>
                  </div>
                )}
                {user.consultantProfile.experience && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Experience</p>
                    <p className="text-sm mt-1">{user.consultantProfile.experience} years</p>
                  </div>
                )}
                {user.consultantProfile.hourlyRate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hourly Rate</p>
                    <p className="text-sm mt-1">SAR {user.consultantProfile.hourlyRate}</p>
                  </div>
                )}
              </div>
              {user.consultantProfile.bio && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bio</p>
                  <p className="text-sm mt-1">{user.consultantProfile.bio}</p>
                </div>
              )}
              {user.consultantProfile.skills && user.consultantProfile.skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {user.consultantProfile.skills.map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Banking Information (Consultant Only) */}
        {user.consultantProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Banking Information</CardTitle>
              <CardDescription>Payment and account details for this consultant</CardDescription>
            </CardHeader>
            <CardContent>
              {bankingData?.bankInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bankingData.bankInfo.bankName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
                      <p className="text-sm mt-1">{bankingData.bankInfo.bankName}</p>
                    </div>
                  )}
                  {bankingData.bankInfo.accountHolderName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Account Holder Name</p>
                      <p className="text-sm mt-1">{bankingData.bankInfo.accountHolderName}</p>
                    </div>
                  )}
                  {bankingData.bankInfo.accountNumber && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Account Number / IBAN</p>
                      <p className="text-sm mt-1 font-mono">{bankingData.bankInfo.accountNumber}</p>
                    </div>
                  )}
                  {bankingData.bankInfo.swiftCode && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">SWIFT Code</p>
                      <p className="text-sm mt-1 font-mono">{bankingData.bankInfo.swiftCode}</p>
                    </div>
                  )}
                  {bankingData.bankInfo.ifscCode && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">IFSC Code</p>
                      <p className="text-sm mt-1 font-mono">{bankingData.bankInfo.ifscCode}</p>
                    </div>
                  )}
                  {bankingData.bankInfo.bankCountry && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bank Country</p>
                      <p className="text-sm mt-1">{bankingData.bankInfo.bankCountry}</p>
                    </div>
                  )}
                  {bankingData.bankInfo.currency && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Currency</p>
                      <p className="text-sm mt-1">{bankingData.bankInfo.currency}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
                    <Badge 
                      variant={bankingData.bankInfo.verified ? "default" : "outline"} 
                      className="mt-1"
                      data-testid="badge-bank-verification"
                    >
                      {bankingData.bankInfo.verified ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </span>
                      ) : (
                        "Not Verified"
                      )}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm font-medium">No Banking Information</p>
                  <p className="text-sm text-muted-foreground">
                    This consultant has not provided their banking details yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* KYC Documents */}
        {user.kycDocuments && user.kycDocuments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>KYC Documents</CardTitle>
              <CardDescription>
                Verification documents uploaded by the user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {user.kycDocuments.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.documentType.replace('_', ' ')} • {doc.status}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      doc.status === 'approved' ? 'default' :
                      doc.status === 'rejected' ? 'destructive' :
                      'outline'
                    }>
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Approval Actions */}
      {((user.clientProfile && user.clientProfile.profileStatus === 'submitted' && user.clientProfile.approvalStatus === 'pending') || 
        (user.consultantProfile && user.consultantProfile.profileStatus === 'submitted' && user.consultantProfile.approvalStatus === 'pending')) && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Approval Actions</CardTitle>
            <CardDescription>
              Review and approve or reject the submitted profile(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.clientProfile && user.clientProfile.profileStatus === 'submitted' && user.clientProfile.approvalStatus === 'pending' && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Client Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    Status: {user.clientProfile.approvalStatus || 'pending'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setApprovalDialog({ 
                      open: true, 
                      action: 'reject', 
                      profileType: 'client' 
                    })}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    data-testid="button-reject-client-profile"
                  >
                    {(approveMutation.isPending || rejectMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!(approveMutation.isPending || rejectMutation.isPending) && (
                      <ThumbsDown className="mr-2 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setApprovalDialog({ 
                      open: true, 
                      action: 'approve', 
                      profileType: 'client' 
                    })}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    data-testid="button-approve-client-profile"
                  >
                    {(approveMutation.isPending || rejectMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!(approveMutation.isPending || rejectMutation.isPending) && (
                      <ThumbsUp className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            )}

            {user.consultantProfile && user.consultantProfile.profileStatus === 'submitted' && user.consultantProfile.approvalStatus === 'pending' && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Consultant Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    Status: {user.consultantProfile.approvalStatus || 'pending'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setApprovalDialog({ 
                      open: true, 
                      action: 'reject', 
                      profileType: 'consultant' 
                    })}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    data-testid="button-reject-consultant-profile"
                  >
                    {(approveMutation.isPending || rejectMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!(approveMutation.isPending || rejectMutation.isPending) && (
                      <ThumbsDown className="mr-2 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setApprovalDialog({ 
                      open: true, 
                      action: 'approve', 
                      profileType: 'consultant' 
                    })}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    data-testid="button-approve-consultant-profile"
                  >
                    {(approveMutation.isPending || rejectMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!(approveMutation.isPending || rejectMutation.isPending) && (
                      <ThumbsUp className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => {
        setApprovalDialog({ ...approvalDialog, open });
        if (!open) setAdminNotes("");
      }}>
        <DialogContent data-testid="dialog-approval">
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'} {approvalDialog.profileType} Profile
            </DialogTitle>
            <DialogDescription>
              {approvalDialog.action === 'approve' 
                ? 'This will approve the profile and notify the user.'
                : 'Please provide a reason for rejection. The user will be notified.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                Admin Notes {approvalDialog.action === 'reject' ? '(Required)' : '(Optional)'}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  approvalDialog.action === 'approve' 
                    ? "Add optional notes about this approval..." 
                    : "Explain why this profile was rejected..."
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                data-testid="textarea-admin-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialog({ open: false, action: 'approve', profileType: null });
                setAdminNotes("");
              }}
              data-testid="button-cancel-approval"
            >
              Cancel
            </Button>
            <Button
              variant={approvalDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleApprovalAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid="button-confirm-approval"
            >
              {(approveMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {approvalDialog.action === 'approve' ? 'Approve Profile' : 'Reject Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
