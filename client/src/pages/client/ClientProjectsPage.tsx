import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { ProjectProgressBar } from "@/components/ProjectProgressBar";
import { Calendar, DollarSign, User, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ClientProjectsPage() {
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
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="page-client-projects">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">My Projects</h1>
          <p className="text-muted-foreground">Track and manage your IT projects</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-projects">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-projects">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
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
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="awaiting_review">Awaiting Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No projects found</p>
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
                      <div className="text-muted-foreground">Consultant</div>
                      <div className="font-medium">Consultant #{project.consultantId.substring(0, 8)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Budget</div>
                      <div className="font-medium" data-testid={`text-budget-${project.id}`}>
                        {project.currency} {parseFloat(project.budget).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Deadline</div>
                      <div className="font-medium">
                        {project.endDate ? formatDistanceToNow(new Date(project.endDate), { addSuffix: true }) : 'Not set'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link href={`/client/projects/${project.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-project-${project.id}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Details
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
