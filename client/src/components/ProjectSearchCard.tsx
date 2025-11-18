import { Calendar, MapPin, DollarSign, Clock, Eye, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';
import { BookmarkButton } from '@/components/BookmarkButton';

interface ProjectSearchCardProps {
  project: {
    id: string;
    title: string;
    description?: string | null;
    category?: string | null;
    subcategory?: string | null;
    budget?: number | null;
    deadline?: Date | string | null;
    location?: string | null;
    status?: string | null;
    createdAt: Date | string;
    requiredSkills?: string[] | null;
    viewCount?: number | null;
    bidCount?: number | null;
  };
}

export function ProjectSearchCard({ project }: ProjectSearchCardProps) {
  const [, navigate] = useLocation();

  const statusColors: Record<string, string> = {
    open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
    closed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  };

  const excerpt = project.description
    ? project.description.substring(0, 150) + (project.description.length > 150 ? '...' : '')
    : 'No description provided';

  const deadline = project.deadline ? new Date(project.deadline) : null;
  const createdAt = new Date(project.createdAt);

  return (
    <Card className="hover-elevate transition-all" data-testid={`project-card-${project.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 
              className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/consultant/projects/${project.id}`)}
              data-testid={`project-title-${project.id}`}
            >
              {project.title}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Posted {formatDistanceToNow(createdAt, { addSuffix: true })}
              </div>
              {project.viewCount !== null && project.viewCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {project.viewCount} views
                </div>
              )}
              {project.bidCount !== null && project.bidCount !== undefined && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {project.bidCount} bids
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.status && (
              <Badge 
                className={statusColors[project.status] || 'bg-gray-100'}
                data-testid={`project-status-${project.id}`}
              >
                {project.status.replace('_', ' ')}
              </Badge>
            )}
            <BookmarkButton jobId={project.id} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground" data-testid={`project-description-${project.id}`}>
          {excerpt}
        </p>

        <div className="flex flex-wrap gap-4 text-sm">
          {project.category && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Badge variant="outline" data-testid={`project-category-${project.id}`}>
                {project.category}
              </Badge>
              {project.subcategory && (
                <Badge variant="outline" className="text-xs">
                  {project.subcategory}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {project.budget && (
            <div className="flex items-center gap-1" data-testid={`project-budget-${project.id}`}>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">SAR {project.budget.toLocaleString()}</span>
            </div>
          )}
          {deadline && (
            <div className="flex items-center gap-1" data-testid={`project-deadline-${project.id}`}>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Due {formatDistanceToNow(deadline, { addSuffix: true })}</span>
            </div>
          )}
          {project.location && (
            <div className="flex items-center gap-1" data-testid={`project-location-${project.id}`}>
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{project.location}</span>
            </div>
          )}
        </div>

        {project.requiredSkills && project.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.requiredSkills.slice(0, 5).map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs" data-testid={`project-skill-${project.id}-${index}`}>
                {skill}
              </Badge>
            ))}
            {project.requiredSkills.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{project.requiredSkills.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t">
        <Button
          variant="default"
          onClick={() => navigate(`/consultant/projects/${project.id}`)}
          data-testid={`button-view-project-${project.id}`}
        >
          View Details
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/consultant/projects/${project.id}#submit-bid`)}
          data-testid={`button-submit-bid-${project.id}`}
        >
          Submit Bid
        </Button>
      </CardFooter>
    </Card>
  );
}
