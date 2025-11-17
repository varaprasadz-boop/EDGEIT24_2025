import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, XCircle, Clock, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CategoryRequest {
  id: string;
  vendorId: string;
  categoryId: string;
  status: string;
  yearsOfExperience?: number;
  reasonForRequest?: string;
  adminNotes?: string;
  verificationBadge?: string;
  maxConcurrentJobs?: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export function CategoryRequestsList() {
  const { data, isLoading } = useQuery<{ requests: CategoryRequest[] }>({
    queryKey: ['/api/category-requests'],
  });

  const requests = data?.requests || [];
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  if (isLoading) {
    return (
      <Card data-testid="card-category-requests">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            My Category Access Requests
          </CardTitle>
          <CardDescription>Track your requests for specialized category access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-category-requests">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              My Category Access Requests
            </CardTitle>
            <CardDescription>Track your requests for specialized category access</CardDescription>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Badge variant="outline" data-testid="badge-pending-count">
                <Clock className="h-3 w-3 mr-1" />
                {pendingCount} Pending
              </Badge>
            )}
            {approvedCount > 0 && (
              <Badge variant="default" data-testid="badge-approved-count">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {approvedCount} Approved
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-requests">
            <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No category access requests yet</p>
            <p className="text-sm">Request access to specialized categories to unlock more opportunities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request, index) => (
              <div
                key={request.id}
                className="flex items-start justify-between p-4 rounded-md border hover-elevate"
                data-testid={`request-item-${index}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm" data-testid={`request-category-${index}`}>
                      Category Request
                    </h4>
                    <Badge
                      variant={
                        request.status === 'approved' ? 'default' :
                        request.status === 'rejected' ? 'destructive' :
                        'outline'
                      }
                      data-testid={`request-status-${index}`}
                    >
                      {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {request.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                    {request.verificationBadge && (
                      <Badge variant="secondary" data-testid={`request-badge-${index}`}>
                        <Award className="h-3 w-3 mr-1" />
                        {request.verificationBadge.charAt(0).toUpperCase() + request.verificationBadge.slice(1)}
                      </Badge>
                    )}
                  </div>

                  {request.yearsOfExperience !== undefined && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Experience: {request.yearsOfExperience} years
                    </p>
                  )}

                  {request.reasonForRequest && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {request.reasonForRequest}
                    </p>
                  )}

                  {request.adminNotes && (
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <p className="text-xs font-medium">Admin Notes:</p>
                      <p className="text-xs text-muted-foreground">{request.adminNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 ml-4">
                  <div className="text-xs text-muted-foreground" data-testid={`request-date-${index}`}>
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </div>
                  {request.maxConcurrentJobs && (
                    <div className="text-xs text-muted-foreground">
                      Max jobs: {request.maxConcurrentJobs}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
