import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId: string | null;
  children?: CategoryNode[];
}

interface Job {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  budgetType: string | null;
  categoryId: string;
  categoryPathLabel: string;
  status: string;
  createdAt: string;
}

export default function BrowseJobs() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Fetch category tree
  const { data: treeResponse } = useQuery<{ tree: CategoryNode[] }>({
    queryKey: ['/api/categories/tree'],
  });

  const categoryTree = treeResponse?.tree || [];

  // Fetch jobs with category filter
  const { data: jobsResponse, isLoading } = useQuery<{ jobs: Job[]; total: number }>({
    queryKey: ['/api/jobs', selectedCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams({ forConsultant: 'true' });
      if (selectedCategoryId) {
        params.append('categoryId', selectedCategoryId);
      }
      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
  });

  const jobs = jobsResponse?.jobs || [];

  // Flatten category tree for dropdown
  const flattenCategories = (nodes: CategoryNode[], depth: number = 0): { id: string; name: string; depth: number }[] => {
    return nodes.flatMap(node => [
      { id: node.id, name: node.name, depth },
      ...(node.children ? flattenCategories(node.children, depth + 1) : [])
    ]);
  };

  const allCategories = flattenCategories(categoryTree);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-browse-jobs-title">
              Browse Available Jobs
            </h1>
            <p className="text-muted-foreground" data-testid="text-browse-jobs-subtitle">
              Find opportunities that match your skills
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-filter">Filter by Category</Label>
            <Select value={selectedCategoryId || "all"} onValueChange={(value) => setSelectedCategoryId(value === "all" ? null : value)}>
              <SelectTrigger id="category-filter" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                    {"  ".repeat(cat.depth)}
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-jobs">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No jobs available{selectedCategoryId ? " in this category" : ""}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle data-testid={`text-job-title-${job.id}`}>{job.title}</CardTitle>
                        <CardDescription className="mt-2" data-testid={`text-job-category-${job.id}`}>
                          {job.categoryPathLabel}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" data-testid={`badge-job-status-${job.id}`}>
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4" data-testid={`text-job-description-${job.id}`}>
                      {job.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {job.budget && (
                        <div className="flex items-center gap-1" data-testid={`text-job-budget-${job.id}`}>
                          <DollarSign className="h-4 w-4" />
                          ﷼ {parseFloat(job.budget).toLocaleString()}
                        </div>
                      )}
                      <div className="flex items-center gap-1" data-testid={`text-job-created-${job.id}`}>
                        <Clock className="h-4 w-4" />
                        {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button className="w-full bg-primary text-primary-foreground" data-testid={`button-bid-${job.id}`}>
                        Submit Bid
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
