import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Lightbulb, Star, ThumbsUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminFeedback() {
  const { toast } = useToast();
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [adminResponse, setAdminResponse] = useState("");

  // Fetch all feedback
  const { data: feedback, isLoading: feedbackLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/feedback'],
  });

  // Fetch all feature suggestions
  const { data: features, isLoading: featuresLoading } = useQuery<any[]>({
    queryKey: ['/api/feature-suggestions'],
  });

  // Update feedback status mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      return await apiRequest("PATCH", `/api/admin/feedback/${id}`, { status, adminNotes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/feedback'] });
      setSelectedFeedback(null);
      setAdminNotes("");
      toast({
        title: "Feedback Updated",
        description: "Feedback status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback",
        variant: "destructive",
      });
    },
  });

  // Update feature suggestion mutation
  const updateFeatureMutation = useMutation({
    mutationFn: async ({ id, status, response }: { id: string; status: string; response: string }) => {
      return await apiRequest("PATCH", `/api/admin/feature-suggestions/${id}`, { status, adminResponse: response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-suggestions'] });
      setSelectedFeature(null);
      setAdminResponse("");
      toast({
        title: "Feature Suggestion Updated",
        description: "Feature suggestion has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update feature suggestion",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      under_review: "default",
      in_progress: "default",
      completed: "default",
      rejected: "secondary",
      planned: "default",
    };

    return <Badge variant={variants[status] || "secondary"}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  if (feedbackLoading || featuresLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4 mb-4">
        <AdminPageHeader
          title="Feedback & Feature Management"
          subtitle="Review and manage user feedback and feature requests"
          testId="feedback"
        />
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{feedback?.filter((f: any) => f.status === 'pending').length || 0}</div>
            <div className="text-sm text-muted-foreground">Pending Feedback</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{features?.filter((f: any) => f.status === 'pending').length || 0}</div>
            <div className="text-sm text-muted-foreground">New Suggestions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{features?.filter((f: any) => f.status === 'planned').length || 0}</div>
            <div className="text-sm text-muted-foreground">Planned Features</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{feedback?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Feedback</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="feedback" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            <MessageSquare className="mr-2 h-4 w-4" />
            User Feedback ({feedback?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">
            <Lightbulb className="mr-2 h-4 w-4" />
            Feature Requests ({features?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* User Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          {!feedback || feedback.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">No feedback submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            feedback.map((item: any) => (
              <Card
                key={item.id}
                className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                onClick={() => setSelectedFeedback(item)}
                data-testid={`card-feedback-${item.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.feedbackType?.replace('_', ' ')} • {item.category?.replace('_', ' ')}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {getStatusBadge(item.status)}
                      {item.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {item.rating}/5
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    {format(new Date(item.createdAt), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Feature Requests Tab */}
        <TabsContent value="features" className="space-y-4">
          {!features || features.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">No feature suggestions yet</p>
              </CardContent>
            </Card>
          ) : (
            features.map((feature: any) => (
              <Card
                key={feature.id}
                className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                onClick={() => setSelectedFeature(feature)}
                data-testid={`card-feature-${feature.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="mt-1">{feature.category?.replace('_', ' ')}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {getStatusBadge(feature.status)}
                      <div className="flex items-center gap-1 text-sm">
                        <ThumbsUp className="h-4 w-4" />
                        {feature.voteCount || 0} votes
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{feature.description}</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    {format(new Date(feature.createdAt), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle data-testid="dialog-feedback-title">{selectedFeedback?.title}</DialogTitle>
                <DialogDescription>
                  {selectedFeedback?.feedbackType?.replace('_', ' ')} • {selectedFeedback?.category?.replace('_', ' ')}
                </DialogDescription>
              </div>
              {selectedFeedback && getStatusBadge(selectedFeedback.status)}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                {selectedFeedback?.description}
              </p>
            </div>

            {selectedFeedback?.rating && (
              <div>
                <h4 className="font-medium mb-2">User Rating</h4>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < selectedFeedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Update Status</label>
              <Select
                value={selectedFeedback?.status}
                onValueChange={(status) => {
                  if (selectedFeedback) {
                    setSelectedFeedback({ ...selectedFeedback, status });
                  }
                }}
              >
                <SelectTrigger data-testid="select-feedback-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Admin Notes</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this feedback..."
                rows={4}
                data-testid="textarea-admin-notes"
              />
            </div>

            <Button
              onClick={() => {
                if (selectedFeedback) {
                  updateFeedbackMutation.mutate({
                    id: selectedFeedback.id,
                    status: selectedFeedback.status,
                    notes: adminNotes,
                  });
                }
              }}
              disabled={updateFeedbackMutation.isPending}
              data-testid="button-update-feedback"
            >
              {updateFeedbackMutation.isPending ? "Updating..." : "Update Feedback"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feature Detail Dialog */}
      <Dialog open={!!selectedFeature} onOpenChange={(open) => !open && setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle data-testid="dialog-feature-title">{selectedFeature?.title}</DialogTitle>
                <DialogDescription>{selectedFeature?.category?.replace('_', ' ')}</DialogDescription>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {selectedFeature && getStatusBadge(selectedFeature.status)}
                <div className="flex items-center gap-1 text-sm">
                  <ThumbsUp className="h-4 w-4" />
                  {selectedFeature?.voteCount || 0} votes
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                {selectedFeature?.description}
              </p>
            </div>

            {selectedFeature?.useCase && (
              <div>
                <h4 className="font-medium mb-2">Use Case</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                  {selectedFeature.useCase}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Update Status</label>
              <Select
                value={selectedFeature?.status}
                onValueChange={(status) => {
                  if (selectedFeature) {
                    setSelectedFeature({ ...selectedFeature, status });
                  }
                }}
              >
                <SelectTrigger data-testid="select-feature-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Admin Response</label>
              <Textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Provide a response to the user..."
                rows={4}
                data-testid="textarea-admin-response"
              />
            </div>

            <Button
              onClick={() => {
                if (selectedFeature) {
                  updateFeatureMutation.mutate({
                    id: selectedFeature.id,
                    status: selectedFeature.status,
                    response: adminResponse,
                  });
                }
              }}
              disabled={updateFeatureMutation.isPending}
              data-testid="button-update-feature"
            >
              {updateFeatureMutation.isPending ? "Updating..." : "Update Feature Suggestion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
