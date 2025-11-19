import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Trash2, CheckCircle, XCircle, Clock, FileIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuthContext } from "@/contexts/AuthContext";

type KycDocument = {
  id: string;
  userId: string;
  profileType: 'client' | 'consultant';
  documentType: 'commercial_registration' | 'tax_certificate' | 'national_id' | 'authorization_letter' | 'business_license' | 'other';
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  commercial_registration: 'Commercial Registration',
  tax_certificate: 'Tax Certificate (VAT)',
  national_id: 'National ID',
  authorization_letter: 'Authorization Letter',
  business_license: 'Business License',
  other: 'Other Document',
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; variant: "default" | "destructive" | "outline" | "secondary" }> = {
  pending: { label: 'Under Review', icon: Clock, variant: 'secondary' },
  approved: { label: 'Approved', icon: CheckCircle, variant: 'default' },
  rejected: { label: 'Rejected', icon: XCircle, variant: 'destructive' },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function KycDocumentUpload() {
  const { toast } = useToast();
  const { user, getSelectedRole } = useAuthContext();
  const selectedRole = getSelectedRole();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');

  const { data: documents = [], isLoading } = useQuery<KycDocument[]>({
    queryKey: ['/api/user/kyc-documents'],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, docType, profileType }: { file: File; docType: string; profileType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);
      formData.append('profileType', profileType);

      const res = await fetch('/api/user/kyc-documents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/kyc-documents'] });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded and is pending review.",
      });
      setSelectedFile(null);
      setDocumentType('');
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest('DELETE', `/api/user/kyc-documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/kyc-documents'] });
      toast({
        title: "Document deleted",
        description: "Document has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only PDF, JPEG, PNG, and DOCX files are allowed.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast({
        title: "Missing information",
        description: "Please select a document type and file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        docType: documentType,
        profileType: selectedRole || user?.role || 'client',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(docId);
    }
  };

  return (
    <div className="space-y-6">
      <Card data-testid="card-kyc-upload">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Verification Documents
          </CardTitle>
          <CardDescription>
            Upload business and identity verification documents for account approval. Supported formats: PDF, JPEG, PNG, DOCX (max 10MB).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger data-testid="select-document-type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial_registration">Commercial Registration</SelectItem>
                <SelectItem value="tax_certificate">Tax Certificate (VAT)</SelectItem>
                <SelectItem value="national_id">National ID</SelectItem>
                <SelectItem value="authorization_letter">Authorization Letter</SelectItem>
                <SelectItem value="business_license">Business License</SelectItem>
                <SelectItem value="other">Other Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Select File *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
              onChange={handleFileChange}
              data-testid="input-kyc-file"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !documentType || uploading}
            data-testid="button-upload-kyc"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-kyc-documents">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Documents
          </CardTitle>
          <CardDescription>
            View and manage your uploaded verification documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : documents.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No documents uploaded yet. Upload your first document above to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => {
                const statusConfig = STATUS_CONFIG[doc.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-4 border rounded-md hover-elevate"
                    data-testid={`document-${doc.id}`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <FileIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate" data-testid={`text-document-name-${doc.id}`}>
                            {doc.originalName}
                          </p>
                          <Badge variant={statusConfig.variant} className="flex items-center gap-1" data-testid={`badge-status-${doc.id}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {DOCUMENT_TYPE_LABELS[doc.documentType]} • {formatFileSize(doc.size)} • Uploaded {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                        </p>
                        {doc.reviewNotes && (
                          <Alert className="mt-2" variant={doc.status === 'rejected' ? 'destructive' : 'default'}>
                            <AlertDescription className="text-sm">
                              <strong>Review Notes:</strong> {doc.reviewNotes}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
