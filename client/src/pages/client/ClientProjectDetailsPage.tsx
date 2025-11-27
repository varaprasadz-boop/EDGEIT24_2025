import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { ProjectProgressBar } from "@/components/ProjectProgressBar";
import { MilestoneCard } from "@/components/MilestoneCard";
import { ProjectDeliveryTab } from "@/components/delivery/ProjectDeliveryTab";
import { EscrowBalanceCard } from "@/components/EscrowBalanceCard";
import { ArrowLeft, CheckCircle, XCircle, Calendar as CalendarIcon, DollarSign, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ClientProjectDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { toast } = useToast();
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: [`/api/projects/${id}`],
    enabled: !!id,
  });

  const { data: paymentStatus } = useQuery({
    queryKey: [`/api/projects/${id}/payment-status`],
    enabled: !!id,
  });

  const approveDeliverableMutation = useMutation({
    mutationFn: async (deliverableId: string) => {
      return await apiRequest(`/api/projects/${id}/deliverables/${deliverableId}/approve`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      toast({ title: t('deliverables.deliverableApproved') });
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async ({ deliverableId, reviewNotes }: any) => {
      return await apiRequest(`/api/projects/${id}/deliverables/${deliverableId}/revision`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewNotes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      setSelectedDeliverable(null);
      toast({ title: t('deliverables.revisionRequested') });
    },
  });

  const extendDeadlineMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/projects/${id}/extend`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      setExtendDialogOpen(false);
      toast({ title: t('projectDetails.extendDeadline.success') });
    },
  });

  const releasePaymentMutation = useMutation({
    mutationFn: async ({ milestoneIndex, amount }: any) => {
      return await apiRequest(`/api/projects/${id}/milestones/${milestoneIndex}/release-payment`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      toast({ title: t('milestones.paymentReleased') });
    },
  });

  const handleExtendDeadline = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    extendDeadlineMutation.mutate({
      newEndDate: formData.get('newEndDate'),
      reason: formData.get('reason'),
    });
  };

  const handleRequestRevision = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    requestRevisionMutation.mutate({
      deliverableId: selectedDeliverable.id,
      reviewNotes: formData.get('reviewNotes'),
    });
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('projectDetails.loadingProject')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="page-client-project-details">
      <div className="flex items-center gap-4">
        <Link href="/client/projects">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold" data-testid="text-project-title">{project.title}</h1>
          <p className="text-muted-foreground">{t('projectDetails.projectId')}: {project.id}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('projectDetails.budget')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-budget">
              {project.currency} {parseFloat(project.budget).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('projectDetails.progress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-progress">
              {project.overallProgress}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('projectDetails.deadline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm" data-testid="text-deadline">
              {project.endDate ? new Date(project.endDate).toLocaleDateString() : t('projectDetails.notSet')}
            </div>
            <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="mt-2" data-testid="button-extend-deadline">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {t('projectDetails.extend')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleExtendDeadline}>
                  <DialogHeader>
                    <DialogTitle>{t('projectDetails.extendDeadline.title')}</DialogTitle>
                    <DialogDescription>
                      {t('projectDetails.extendDeadline.description')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="newEndDate">{t('projectDetails.extendDeadline.newEndDate')}</Label>
                      <Input id="newEndDate" name="newEndDate" type="date" required data-testid="input-new-end-date" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reason">{t('projectDetails.extendDeadline.reason')}</Label>
                      <Textarea id="reason" name="reason" required data-testid="input-reason" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={extendDeadlineMutation.isPending} data-testid="button-submit">
                      {extendDeadlineMutation.isPending ? t('projectDetails.extendDeadline.extending') : t('projectDetails.extendDeadline.extendButton')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">{t('projectDetails.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="milestones" data-testid="tab-milestones">{t('projectDetails.tabs.milestones')}</TabsTrigger>
          <TabsTrigger value="deliverables" data-testid="tab-deliverables">{t('projectDetails.tabs.deliverables')}</TabsTrigger>
          <TabsTrigger value="delivery" data-testid="tab-delivery">
            <Package className="w-4 h-4 mr-2" />
            {t('projectDetails.tabs.delivery')}
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">{t('projectDetails.tabs.activity')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('projectDetails.overview.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{project.description || t('projectDetails.overview.noDescription')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('projectDetails.overview.overallProgress')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectProgressBar 
                overallProgress={project.overallProgress || 0}
                milestones={project.milestones || []}
                showMilestoneBreakdown={true}
              />
            </CardContent>
          </Card>

          {paymentStatus && (
            <EscrowBalanceCard 
              projectBudget={paymentStatus.projectBudget}
              escrowBalance={paymentStatus.escrowBalance}
              releasedAmount={paymentStatus.releasedAmount}
              currency={project.currency || 'SAR'}
            />
          )}
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="grid gap-4">
            {(project.milestones || []).map((milestone: any, index: number) => (
              <Card key={index} data-testid={`card-milestone-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {t('milestones.milestone')} {index + 1}: {milestone.title}
                      </CardTitle>
                      {milestone.description && (
                        <CardDescription>{milestone.description}</CardDescription>
                      )}
                    </div>
                    {milestone.amount && (
                      <Button 
                        size="sm"
                        onClick={() => releasePaymentMutation.mutate({ 
                          milestoneIndex: index, 
                          amount: milestone.amount 
                        })}
                        disabled={milestone.status !== 'completed'}
                        data-testid={`button-release-payment-${index}`}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        {t('milestones.releasePayment')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('milestones.status')}: {milestone.status}</span>
                      <span className="font-medium">{milestone.progress || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deliverables" className="space-y-4">
          <div className="grid gap-4">
            {project.deliverables && project.deliverables.length > 0 ? (
              project.deliverables.map((deliverable: any) => (
                <Card key={deliverable.id} data-testid={`card-deliverable-${deliverable.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{deliverable.title}</CardTitle>
                        <CardDescription>
                          {t('deliverables.milestone')} {deliverable.milestoneIndex + 1} • {deliverable.status}
                        </CardDescription>
                      </div>
                      {deliverable.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => approveDeliverableMutation.mutate(deliverable.id)}
                            data-testid={`button-approve-${deliverable.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {t('deliverables.approve')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedDeliverable(deliverable)}
                            data-testid={`button-request-revision-${deliverable.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {t('deliverables.requestRevision')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{deliverable.description}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">{t('deliverables.noDeliverables')}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {selectedDeliverable && (
            <Dialog open={!!selectedDeliverable} onOpenChange={() => setSelectedDeliverable(null)}>
              <DialogContent>
                <form onSubmit={handleRequestRevision}>
                  <DialogHeader>
                    <DialogTitle>{t('deliverables.requestRevision')}</DialogTitle>
                    <DialogDescription>
                      {t('deliverables.uploadDeliverable')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="reviewNotes">{t('deliverables.reviewNotes')}</Label>
                      <Textarea 
                        id="reviewNotes" 
                        name="reviewNotes" 
                        placeholder={t('deliverables.explainRevision')}
                        required 
                        data-testid="input-review-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={requestRevisionMutation.isPending} data-testid="button-submit-revision">
                      {requestRevisionMutation.isPending ? t('deliverables.submitting') : t('deliverables.requestRevisionButton')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <ProjectDeliveryTab projectId={id!} project={project} userRole="client" />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('projectDetails.activityLog.title')}</CardTitle>
              <CardDescription>{t('projectDetails.activityLog.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.activityLog && project.activityLog.length > 0 ? (
                  project.activityLog.map((activity: any) => (
                    <div key={activity.id} className="flex gap-4" data-testid={`activity-${activity.id}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action.replace('_', ' ').toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('projectDetails.activityLog.noActivity')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
