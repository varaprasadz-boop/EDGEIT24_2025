import { useAuthContext } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  uploadedBy: string;
  conversationId: string;
  versionNumber: number;
  createdAt: string;
}

export default function Documents() {
  const { user } = useAuthContext();

  const { data: documents, isLoading } = useQuery<DocumentFile[]>({
    queryKey: ['/api/documents'],
  });

  if (!user) {
    return <div className="p-6">Loading...</div>;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">Manage all your files and attachments</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-primary mt-1" />
                    <div>
                      <CardTitle className="text-base">{doc.fileName}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {formatFileSize(doc.fileSize)} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        {doc.versionNumber > 1 && ` • Version ${doc.versionNumber}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    data-testid={`button-download-${doc.id}`}
                  >
                    <a href={doc.fileUrl} download={doc.fileName}>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No documents found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Files uploaded in messages will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
