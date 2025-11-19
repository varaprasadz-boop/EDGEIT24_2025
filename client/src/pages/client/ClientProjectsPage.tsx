import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { ProjectProgressBar } from "@/components/ProjectProgressBar";
import { Calendar, DollarSign, User, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ClientProjectsPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projectsData, isLoading } = useQuery({
    queryKey: statusFilter !== 'all' 
      ? [`/api/projects?status=${statusFilter}`]
      : ['/api/projects'],
  });

  const projects = projectsData?.projects || [];

  const stats = {
    active: projects.filter((p: any) => p.status === 'in_progress').length,
    completed: projects.filter((p: any) => p.status === 'completed').length,
    totalSpent: projects.reduce((sum: number, p: any) => {
      if (p.status === 'completed' || p.status === 'in_progress') {
        return sum + parseFloat(p.budget || 0);
      }
      return sum;
    }, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('clientProjects.loadingProjects')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="page-client-projects">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('clientProjects.title')}</h1>
          <p className="text-muted-foreground">{t('clientProjects.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('clientProjects.stats.activeProjects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-projects">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('clientProjects.stats.completedProjects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-projects">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('clientProjects.stats.totalInvestment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-spent">
              SAR {stats.totalSpent.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder={t('clientProjects.filters.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('clientProjects.filters.allProjects')}</SelectItem>
            <SelectItem value="not_started">{t('projectStatus.not_started')}</SelectItem>
            <SelectItem value="in_progress">{t('projectStatus.in_progress')}</SelectItem>
            <SelectItem value="awaiting_review">{t('projectStatus.awaiting_review')}</SelectItem>
            <SelectItem value="completed">{t('projectStatus.completed')}</SelectItem>
            <SelectItem value="on_hold">{t('projectStatus.on_hold')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">{t('clientProjects.emptyState')}</p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project: any) => (
            <Card key={project.id} data-testid={`card-project-${project.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle data-testid={`text-project-title-${project.id}`}>
                      {project.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {project.description?.substring(0, 150)}
                      {project.description?.length > 150 && '...'}
                    </CardDescription>
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ProjectProgressBar 
                  overallProgress={project.overallProgress || 0} 
                  milestones={project.milestones || []}
                />

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">{t('clientProjects.consultant')}</div>
                      <div className="font-medium">Consultant #{project.consultantId.substring(0, 8)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">{t('clientProjects.budget')}</div>
                      <div className="font-medium" data-testid={`text-budget-${project.id}`}>
                        {project.currency} {parseFloat(project.budget).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">{t('clientProjects.deadline')}</div>
                      <div className="font-medium">
                        {project.endDate ? formatDistanceToNow(new Date(project.endDate), { addSuffix: true }) : t('clientProjects.notSet')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link href={`/client/projects/${project.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-project-${project.id}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t('clientProjects.viewDetails')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
