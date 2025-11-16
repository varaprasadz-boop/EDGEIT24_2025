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
import { Checkbox } from "@/components/ui/checkbox";
import { Star, MapPin, DollarSign, Users, Filter, X, Search, CheckCircle } from "lucide-react";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId: string | null;
  children?: CategoryNode[];
}

interface ConsultantProfile {
  id: string;
  fullName: string;
  title: string;
  bio: string;
  companyName: string | null;
  hourlyRate: string | null;
  experience: string | null;
  rating: string | null;
  totalReviews: number;
  completedProjects: number;
  skills: string[] | null;
  operatingRegions: string[] | null;
  availability: string | null;
  verified: boolean;
}

interface SearchFilters {
  search: string;
  categoryId: string | null;
  minRate: string;
  maxRate: string;
  skills: string;
  experience: string | null;
  minRating: string;
  operatingRegions: string;
  availability: string | null;
  verified: boolean | null;
  limit: number;
  offset: number;
}

export default function BrowseConsultants() {
  const [filters, setFilters] = useState<SearchFilters>({
    search: "",
    categoryId: null,
    minRate: "",
    maxRate: "",
    skills: "",
    experience: null,
    minRating: "",
    operatingRegions: "",
    availability: null,
    verified: null,
    limit: 20,
    offset: 0,
  });

  const [showFilters, setShowFilters] = useState(true);

  // Fetch category tree
  const { data: treeResponse } = useQuery<{ tree: CategoryNode[] }>({
    queryKey: ['/api/categories/tree'],
  });

  const categoryTree = treeResponse?.tree || [];

  // Fetch consultants using advanced search API
  const { data: searchResponse, isLoading } = useQuery<{ results: ConsultantProfile[]; total: number }>({
    queryKey: ['/api/consultants/search', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.minRate) params.append('minRate', filters.minRate);
      if (filters.maxRate) params.append('maxRate', filters.maxRate);
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.experience) params.append('experience', filters.experience);
      if (filters.minRating) params.append('minRating', filters.minRating);
      if (filters.operatingRegions) params.append('operatingRegions', filters.operatingRegions);
      if (filters.availability) params.append('availability', filters.availability);
      if (filters.verified !== null) params.append('verified', filters.verified.toString());
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/consultants/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch consultants');
      return response.json();
    },
  });

  const consultants = searchResponse?.results || [];
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
      minRate: "",
      maxRate: "",
      skills: "",
      experience: null,
      minRating: "",
      operatingRegions: "",
      availability: null,
      verified: null,
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
    filters.minRate,
    filters.maxRate,
    filters.skills,
    filters.experience,
    filters.minRating,
    filters.operatingRegions,
    filters.availability,
    filters.verified !== null ? 'verified' : '',
  ].filter(Boolean).length;

  const renderStars = (rating: string | null) => {
    if (!rating) return null;
    const stars = parseFloat(rating);
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < Math.floor(stars) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">{stars.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="text-browse-consultants-title">
                  Find Consultants
                </h1>
                <p className="text-muted-foreground" data-testid="text-browse-consultants-subtitle">
                  Browse skilled IT professionals
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SavedSearches
                  searchType="consultant"
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
                        placeholder="Name, bio, or company..."
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
                    <Label>Hourly Rate Range (SAR)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minRate}
                        onChange={(e) => updateFilter('minRate', e.target.value)}
                        data-testid="input-min-rate"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxRate}
                        onChange={(e) => updateFilter('maxRate', e.target.value)}
                        data-testid="input-max-rate"
                      />
                    </div>
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
                    <Label htmlFor="regions-input">Operating Regions</Label>
                    <Input
                      id="regions-input"
                      placeholder="e.g., Riyadh, Jeddah, Dammam"
                      value={filters.operatingRegions}
                      onChange={(e) => updateFilter('operatingRegions', e.target.value)}
                      data-testid="input-regions"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience-level">Experience Level</Label>
                    <Select
                      value={filters.experience || "all"}
                      onValueChange={(value) => updateFilter('experience', value === "all" ? null : value)}
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
                    <Label htmlFor="min-rating">Minimum Rating</Label>
                    <Select
                      value={filters.minRating || "all"}
                      onValueChange={(value) => updateFilter('minRating', value === "all" ? "" : value)}
                    >
                      <SelectTrigger id="min-rating" data-testid="select-min-rating">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="4">4+ Stars</SelectItem>
                        <SelectItem value="3">3+ Stars</SelectItem>
                        <SelectItem value="2">2+ Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availability">Availability</Label>
                    <Select
                      value={filters.availability || "all"}
                      onValueChange={(value) => updateFilter('availability', value === "all" ? null : value)}
                    >
                      <SelectTrigger id="availability" data-testid="select-availability">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified-only"
                      checked={filters.verified === true}
                      onCheckedChange={(checked) => updateFilter('verified', checked ? true : null)}
                      data-testid="checkbox-verified"
                    />
                    <Label htmlFor="verified-only" className="cursor-pointer">
                      Verified consultants only
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                    {total} consultant{total !== 1 ? 's' : ''} found
                  </p>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : consultants.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-consultants">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No consultants found matching your criteria</p>
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
                      {consultants.map((consultant) => (
                        <Card key={consultant.id} className="hover-elevate" data-testid={`card-consultant-${consultant.id}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle data-testid={`text-consultant-name-${consultant.id}`}>
                                    {consultant.fullName}
                                  </CardTitle>
                                  {consultant.verified && (
                                    <CheckCircle className="h-5 w-5 text-primary" data-testid={`icon-verified-${consultant.id}`} />
                                  )}
                                </div>
                                <CardDescription className="mt-1" data-testid={`text-consultant-title-${consultant.id}`}>
                                  {consultant.title}
                                  {consultant.companyName && ` at ${consultant.companyName}`}
                                </CardDescription>
                              </div>
                              {consultant.hourlyRate && (
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-lg font-semibold" data-testid={`text-consultant-rate-${consultant.id}`}>
                                    <DollarSign className="h-5 w-5" />
                                    ﷼{parseFloat(consultant.hourlyRate).toLocaleString()}
                                  </div>
                                  <p className="text-xs text-muted-foreground">per hour</p>
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4" data-testid={`text-consultant-bio-${consultant.id}`}>
                              {consultant.bio}
                            </p>

                            {consultant.skills && consultant.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4" data-testid={`container-skills-${consultant.id}`}>
                                {consultant.skills.slice(0, 8).map((skill, idx) => (
                                  <Badge key={idx} variant="outline" data-testid={`badge-skill-${consultant.id}-${idx}`}>
                                    {skill}
                                  </Badge>
                                ))}
                                {consultant.skills.length > 8 && (
                                  <Badge variant="outline">+{consultant.skills.length - 8} more</Badge>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-sm mb-4">
                              {consultant.rating && (
                                <div className="flex items-center gap-2" data-testid={`rating-${consultant.id}`}>
                                  {renderStars(consultant.rating)}
                                  <span className="text-muted-foreground">
                                    ({consultant.totalReviews} review{consultant.totalReviews !== 1 ? 's' : ''})
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1" data-testid={`projects-${consultant.id}`}>
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {consultant.completedProjects} project{consultant.completedProjects !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            {consultant.operatingRegions && consultant.operatingRegions.length > 0 && (
                              <div className="flex items-start gap-2 mb-4" data-testid={`regions-${consultant.id}`}>
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex flex-wrap gap-2">
                                  {consultant.operatingRegions.slice(0, 3).map((region, idx) => (
                                    <span key={idx} className="text-sm text-muted-foreground">
                                      {region}{idx < Math.min(consultant.operatingRegions!.length - 1, 2) ? ',' : ''}
                                    </span>
                                  ))}
                                  {consultant.operatingRegions.length > 3 && (
                                    <span className="text-sm text-muted-foreground">
                                      +{consultant.operatingRegions.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3">
                              <Button className="flex-1 bg-primary text-primary-foreground" data-testid={`button-view-profile-${consultant.id}`}>
                                View Profile
                              </Button>
                              {consultant.availability === 'available' && (
                                <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                                  Available
                                </Badge>
                              )}
                              {consultant.experience && (
                                <Badge variant="secondary" data-testid={`badge-experience-${consultant.id}`}>
                                  {consultant.experience}
                                </Badge>
                              )}
                            </div>
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
