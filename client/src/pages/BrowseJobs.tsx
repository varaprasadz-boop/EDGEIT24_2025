import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { SavedSearches } from "@/components/SavedSearches";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Briefcase, DollarSign, Clock, Search, Filter, X } from "lucide-react";

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
  skills: string[] | null;
  experienceLevel: string | null;
  createdAt: string;
}

interface SearchFilters {
  search: string;
  categoryId: string | null;
  minBudget: string;
  maxBudget: string;
  skills: string;
  experienceLevel: string | null;
  status: string | null;
  budgetType: string | null;
  limit: number;
  offset: number;
}

export default function BrowseJobs() {
  const [filters, setFilters] = useState<SearchFilters>({
    search: "",
    categoryId: null,
    minBudget: "",
    maxBudget: "",
    skills: "",
    experienceLevel: null,
    status: null,
    budgetType: null,
    limit: 20,
    offset: 0,
  });

  const [showFilters, setShowFilters] = useState(true);

  // Fetch category tree
  const { data: treeResponse } = useQuery<{ tree: CategoryNode[] }>({
    queryKey: ['/api/categories/tree'],
  });

  const categoryTree = treeResponse?.tree || [];

  // Fetch jobs using advanced search API
  const { data: searchResponse, isLoading } = useQuery<{ results: Job[]; total: number }>({
    queryKey: ['/api/jobs/search', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.minBudget) params.append('minBudget', filters.minBudget);
      if (filters.maxBudget) params.append('maxBudget', filters.maxBudget);
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
      if (filters.status) params.append('status', filters.status);
      if (filters.budgetType) params.append('budgetType', filters.budgetType);
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/jobs/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
  });

  const jobs = searchResponse?.results || [];
  const total = searchResponse?.total || 0;
  const totalPages = Math.ceil(total / filters.limit);
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;

  // Flatten category tree for dropdown
  const flattenCategories = (nodes: CategoryNode[], depth: number = 0): { id: string; name: string; depth: number }[] => {
    return nodes.flatMap(node => [
      { id: node.id, name: node.name, depth },
      ...(node.children ? flattenCategories(node.children, depth + 1) : [])
    ]);
  };

  const allCategories = flattenCategories(categoryTree);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      categoryId: null,
      minBudget: "",
      maxBudget: "",
      skills: "",
      experienceLevel: null,
      status: null,
      budgetType: null,
      limit: 20,
      offset: 0,
    });
  };

  const goToPage = (page: number) => {
    setFilters(prev => ({ ...prev, offset: (page - 1) * prev.limit }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount = [
    filters.search,
    filters.categoryId,
    filters.minBudget,
    filters.maxBudget,
    filters.skills,
    filters.experienceLevel,
    filters.status,
    filters.budgetType,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="text-browse-jobs-title">
                  Browse Available Jobs
                </h1>
                <p className="text-muted-foreground" data-testid="text-browse-jobs-subtitle">
                  Find opportunities that match your skills
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SavedSearches
                  searchType="job"
                  currentFilters={filters}
                  onLoadSearch={(loadedFilters) => setFilters({ ...filters, ...loadedFilters, offset: 0 })}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2" data-testid="badge-filter-count">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {showFilters && (
              <Card className="lg:col-span-1 h-fit" data-testid="card-filters">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Filters</CardTitle>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        data-testid="button-clear-filters"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-input">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search-input"
                        placeholder="Job title or description..."
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="pl-9"
                        data-testid="input-search"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="category-filter">Category</Label>
                    <Select
                      value={filters.categoryId || "all"}
                      onValueChange={(value) => updateFilter('categoryId', value === "all" ? null : value)}
                    >
                      <SelectTrigger id="category-filter" data-testid="select-category">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                            {"  ".repeat(cat.depth)}{cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Budget Range (SAR)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minBudget}
                        onChange={(e) => updateFilter('minBudget', e.target.value)}
                        data-testid="input-min-budget"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxBudget}
                        onChange={(e) => updateFilter('maxBudget', e.target.value)}
                        data-testid="input-max-budget"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-type">Budget Type</Label>
                    <Select
                      value={filters.budgetType || "all"}
                      onValueChange={(value) => updateFilter('budgetType', value === "all" ? null : value)}
                    >
                      <SelectTrigger id="budget-type" data-testid="select-budget-type">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="skills-input">Skills</Label>
                    <Input
                      id="skills-input"
                      placeholder="e.g., React, Node.js, Python"
                      value={filters.skills}
                      onChange={(e) => updateFilter('skills', e.target.value)}
                      data-testid="input-skills"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience-level">Experience Level</Label>
                    <Select
                      value={filters.experienceLevel || "all"}
                      onValueChange={(value) => updateFilter('experienceLevel', value === "all" ? null : value)}
                    >
                      <SelectTrigger id="experience-level" data-testid="select-experience">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid">Mid-Level</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => updateFilter('status', value === "all" ? null : value)}
                    >
                      <SelectTrigger id="status-filter" data-testid="select-status">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                    {total} job{total !== 1 ? 's' : ''} found
                  </p>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : jobs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-jobs">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No jobs found matching your criteria</p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={clearFilters}
                          data-testid="button-clear-no-results"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
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

                            {job.skills && job.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4" data-testid={`container-skills-${job.id}`}>
                                {job.skills.map((skill, idx) => (
                                  <Badge key={idx} variant="outline" data-testid={`badge-skill-${job.id}-${idx}`}>
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                              {job.budget && (
                                <div className="flex items-center gap-1" data-testid={`text-job-budget-${job.id}`}>
                                  <DollarSign className="h-4 w-4" />
                                  ﷼ {parseFloat(job.budget).toLocaleString()}
                                  {job.budgetType && (
                                    <span className="text-xs ml-1">({job.budgetType})</span>
                                  )}
                                </div>
                              )}
                              {job.experienceLevel && (
                                <Badge variant="outline" data-testid={`badge-experience-${job.id}`}>
                                  {job.experienceLevel}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1 ml-auto" data-testid={`text-job-created-${job.id}`}>
                                <Clock className="h-4 w-4" />
                                {new Date(job.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <Button className="w-full bg-primary text-primary-foreground" data-testid={`button-bid-${job.id}`}>
                              Submit Bid
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          data-testid="button-prev-page"
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(page)}
                                data-testid={`button-page-${page}`}
                              >
                                {page}
                              </Button>
                            );
                          })}
                          {totalPages > 5 && <span className="text-muted-foreground">...</span>}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          data-testid="button-next-page"
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
