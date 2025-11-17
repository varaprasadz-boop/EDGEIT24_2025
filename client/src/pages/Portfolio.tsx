import { useAuthContext } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, Briefcase } from "lucide-react";

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  completedAt: string;
  rating: number | null;
  reviewText: string | null;
  clientName: string;
  category: string;
  budget: string;
}

export default function Portfolio() {
  const { user } = useAuthContext();
  const isConsultant = user?.role === 'consultant' || user?.role === 'both';

  const { data: projects, isLoading } = useQuery<PortfolioProject[]>({
    queryKey: ['/api/portfolio'],
    enabled: isConsultant,
  });

  if (!user) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isConsultant) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Portfolio is only available for consultants</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Portfolio</h1>
        <p className="text-muted-foreground">Showcase your completed projects</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id} data-testid={`card-project-${project.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" data-testid={`badge-category-${project.id}`}>
                    {project.category}
                  </Badge>
                  {project.rating && (
                    <div className="flex items-center gap-1" data-testid={`rating-${project.id}`}>
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{project.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl">{project.title}</CardTitle>
                <CardDescription className="mt-2 line-clamp-3">
                  {project.description}
                </CardDescription>
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span>Client: {project.clientName}</span>
                  <span>•</span>
                  <span>Budget: {project.budget} SAR</span>
                </div>
                {project.reviewText && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm italic">"{project.reviewText}"</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-3">
                  Completed {new Date(project.completedAt).toLocaleDateString()}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>No Completed Projects</CardTitle>
            <CardDescription className="mt-2">
              Your completed projects will appear here
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
