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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { ProjectProgressBar } from "@/components/ProjectProgressBar";
import { MilestoneCard } from "@/components/MilestoneCard";
import { ProjectDeliveryTab } from "@/components/delivery/ProjectDeliveryTab";
import { ArrowLeft, Upload, MessageSquare, Users, FileText, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ConsultantProjectDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { toast } = useToast();
  const [deliverableDialogOpen, setDeliverableDialogOpen] = useState(false);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number>(0);

  const { data: project, isLoading } = useQuery({
    queryKey: [`/api/projects/${id}`],
    enabled: !!id,
  });

  const submitDeliverableMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/projects/${id}/deliverables`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      setDeliverableDialogOpen(false);
      toast({ title: t('deliverables.deliverableSubmitted') });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneIndex, status, progress }: any) => {
      return await apiRequest(`/api/projects/${id}/milestones/${milestoneIndex}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, progress }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      toast({ title: t('milestones.milestoneUpdated') });
    },
  });

  const handleSubmitDeliverable = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    submitDeliverableMutation.mutate({
      title: formData.get('title'),
      description: formData.get('description'),
      milestoneIndex: selectedMilestoneIndex,
      fileUrl: 'mock://deliverable.pdf',
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
    <div className="container mx-auto py-6 space-y-6" data-testid="page-consultant-project-details">
      <div className="flex items-center gap-4">
        <Link href="/consultant/projects">
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

          {project.scope && (
            <Card>
              <CardHeader>
                <CardTitle>{t('projectDetails.overview.scopeOfWork')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{project.scope}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('milestones.projectMilestones')}</h3>
            <Dialog open={deliverableDialogOpen} onOpenChange={setDeliverableDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-submit-deliverable">
                  <Upload className="w-4 h-4 mr-2" />
                  {t('deliverables.submitDeliverable')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmitDeliverable}>
                  <DialogHeader>
                    <DialogTitle>{t('deliverables.submitDeliverable')}</DialogTitle>
                    <DialogDescription>
                      {t('deliverables.uploadDeliverable')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="milestone">{t('deliverables.milestone')}</Label>
                      <Select 
                        value={selectedMilestoneIndex.toString()}
                        onValueChange={(v) => setSelectedMilestoneIndex(parseInt(v))}
                      >
                        <SelectTrigger data-testid="select-milestone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(project.milestones || []).map((m: any, i: number) => (
                            <SelectItem key={i} value={i.toString()}>
                              {t('milestones.milestone')} {i + 1}: {m.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="title">{t('deliverables.title')}</Label>
                      <Input id="title" name="title" required data-testid="input-deliverable-title" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">{t('deliverables.description')}</Label>
                      <Textarea id="description" name="description" data-testid="input-deliverable-description" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={submitDeliverableMutation.isPending} data-testid="button-submit">
                      {submitDeliverableMutation.isPending ? t('deliverables.submitting') : t('deliverables.submit')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {(project.milestones || []).map((milestone: any, index: number) => (
              <MilestoneCard
                key={index}
                milestone={milestone}
                index={index}
                currency={project.currency}
                commentsCount={project.comments?.filter((c: any) => c.milestoneIndex === index).length || 0}
                onUploadDeliverable={() => {
                  setSelectedMilestoneIndex(index);
                  setDeliverableDialogOpen(true);
                }}
              />
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
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{deliverable.description}</p>
                    {deliverable.reviewNotes && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium">{t('deliverables.reviewNotes')}:</p>
                        <p className="text-sm text-muted-foreground">{deliverable.reviewNotes}</p>
                      </div>
                    )}
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
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <ProjectDeliveryTab projectId={id!} project={project} userRole="consultant" />
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
