import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { PublicLayout } from "@/components/PublicLayout";
import { SavedSearches } from "@/components/SavedSearches";
import { AuthGateDialog } from "@/components/AuthGateDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, MapPin, DollarSign, Users, Filter, X, Search, CheckCircle, MessageSquare } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";

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
  verificationBadge?: 'verified' | 'premium' | 'expert' | null;
  categoryPathLabel?: string;
  primaryCategoryId?: string | null;
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
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthContext();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
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

  // Conditional layout wrapper based on authentication
  const Layout = isAuthenticated ? UserLayout : PublicLayout;

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="text-browse-consultants-title">
                  {t('browseConsultants.title')}
                </h1>
                <p className="text-muted-foreground" data-testid="text-browse-consultants-subtitle">
                  {t('browseConsultants.subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <SavedSearches
                    searchType="consultant"
                    currentFilters={filters}
                    onLoadSearch={(loadedFilters) => setFilters({ ...filters, ...loadedFilters, offset: 0 })}
                  />
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? t('browseConsultants.hideFilters') : t('browseConsultants.showFilters')} {t('browseConsultants.toggleFilters')}
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
                    <CardTitle>{t('browseConsultants.filters.title')}</CardTitle>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        data-testid="button-clear-filters"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t('browseConsultants.filters.clear')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-input">{t('browseConsultants.filters.search')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search-input"
                        placeholder={t('browseConsultants.filters.searchPlaceholder')}
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="pl-9"
                        data-testid="input-search"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="category-filter">{t('browseConsultants.filters.category')}</Label>
                    <Select
                      value={filters.categoryId || "all"}
                      onValueChange={(value) => updateFilter('categoryId', value === "all" ? null : value)}
                    >
                      <SelectTrigger id="category-filter" data-testid="select-category">
                        <SelectValue placeholder={t('browseConsultants.filters.allCategories')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('browseConsultants.filters.allCategories')}</SelectItem>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                            {"  ".repeat(cat.depth)}{cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('browseConsultants.filters.hourlyRateRange')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder={t('browseConsultants.filters.minPlaceholder')}
                        value={filters.minRate}
                        onChange={(e) => updateFilter('minRate', e.target.value)}
                        data-testid="input-min-rate"
                      />
                      <Input
                        type="number"
                        placeholder={t('browseConsultants.filters.maxPlaceholder')}
                        value={filters.maxRate}
                        onChange={(e) => updateFilter('maxRate', e.target.value)}
                        data-testid="input-max-rate"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="skills-input">{t('browseConsultants.filters.skills')}</Label>
                    <Input
                      id="skills-input"
                      placeholder={t('browseConsultants.filters.skillsPlaceholder')}
                      value={filters.skills}
                      onChange={(e) => updateFilter('skills', e.target.value)}
                      data-testid="input-skills"
                    />
                    <p className="text-xs text-muted-foreground">{t('browseConsultants.filters.skillsHelper')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regions-input">{t('browseConsultants.filters.operatingRegions')}</Label>
                    <Input
                      id="regions-input"
                      placeholder={t('browseConsultants.filters.regionsPlaceholder')}
                      value={filters.operatingRegions}
                      onChange={(e) => updateFilter('operatingRegions', e.target.value)}
                      data-testid="input-regions"
                    />
                    <p className="text-xs text-muted-foreground">{t('browseConsultants.filters.regionsHelper')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience-level">{t('browseConsultants.filters.experienceLevel')}</Label>
                    <Select
                      value={filters.experience || "all"}
                      onValueChange={(value) => updateFilter('experience', value === "all" ? null : value)}
                    >
                      <SelectTrigger id="experience-level" data-testid="select-experience">
                        <SelectValue placeholder={t('browseConsultants.filters.any')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('browseConsultants.filters.any')}</SelectItem>
                        <SelectItem value="junior">{t('browseConsultants.filters.junior')}</SelectItem>
                        <SelectItem value="mid">{t('browseConsultants.filters.mid')}</SelectItem>
                        <SelectItem value="senior">{t('browseConsultants.filters.senior')}</SelectItem>
                        <SelectItem value="expert">{t('browseConsultants.filters.expert')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-rating">{t('browseConsultants.filters.minRating')}</Label>
                    <Select
                      value={filters.minRating || "all"}
                      onValueChange={(value) => updateFilter('minRating', value === "all" ? "" : value)}
                    >
                      <SelectTrigger id="min-rating" data-testid="select-min-rating">
                        <SelectValue placeholder={t('browseConsultants.filters.any')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('browseConsultants.filters.any')}</SelectItem>
                        <SelectItem value="4">{t('browseConsultants.filters.stars4plus')}</SelectItem>
                        <SelectItem value="3">{t('browseConsultants.filters.stars3plus')}</SelectItem>
                        <SelectItem value="2">{t('browseConsultants.filters.stars2plus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availability">{t('browseConsultants.filters.availability')}</Label>
                    <Select
                      value={filters.availability || "all"}
                      onValueChange={(value) => updateFilter('availability', value === "all" ? null : value)}
                    >
                      <SelectTrigger id="availability" data-testid="select-availability">
                        <SelectValue placeholder={t('browseConsultants.filters.any')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('browseConsultants.filters.any')}</SelectItem>
                        <SelectItem value="available">{t('browseConsultants.filters.available')}</SelectItem>
                        <SelectItem value="busy">{t('browseConsultants.filters.busy')}</SelectItem>
                        <SelectItem value="unavailable">{t('browseConsultants.filters.unavailable')}</SelectItem>
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
                      {t('browseConsultants.filters.verifiedOnly')}
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                    {t(`browseConsultants.results.found_${total === 1 ? 'one' : 'other'}`, { count: total })}
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
                      <p>{t('browseConsultants.results.noConsultants')}</p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={clearFilters}
                          data-testid="button-clear-no-results"
                        >
                          {t('browseConsultants.results.clearFilters')}
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CardTitle data-testid={`text-consultant-name-${consultant.id}`}>
                                    {consultant.fullName}
                                  </CardTitle>
                                  {consultant.verified && !consultant.verificationBadge && (
                                    <CheckCircle className="h-5 w-5 text-primary" data-testid={`icon-verified-${consultant.id}`} />
                                  )}
                                  {consultant.verificationBadge && (
                                    <VerificationBadge badge={consultant.verificationBadge} />
                                  )}
                                </div>
                                <CardDescription className="mt-1" data-testid={`text-consultant-title-${consultant.id}`}>
                                  {consultant.title}
                                  {consultant.companyName && ` ${t('browseConsultants.consultantCard.at')} ${consultant.companyName}`}
                                </CardDescription>
                              </div>
                              {consultant.hourlyRate && (
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-lg font-semibold" data-testid={`text-consultant-rate-${consultant.id}`}>
                                    <DollarSign className="h-5 w-5" />
                                    ﷼{parseFloat(consultant.hourlyRate).toLocaleString()}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{t('browseConsultants.consultantCard.perHour')}</p>
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
                                  <Badge variant="outline">{t('browseConsultants.consultantCard.moreSkills', { count: consultant.skills.length - 8 })}</Badge>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-sm mb-4">
                              {consultant.rating && (
                                <div className="flex items-center gap-2" data-testid={`rating-${consultant.id}`}>
                                  {renderStars(consultant.rating)}
                                  <span className="text-muted-foreground">
                                    ({t(`browseConsultants.consultantCard.review_${consultant.totalReviews === 1 ? 'one' : 'other'}`, { count: consultant.totalReviews })})
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1" data-testid={`projects-${consultant.id}`}>
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {t(`browseConsultants.consultantCard.project_${consultant.completedProjects === 1 ? 'one' : 'other'}`, { count: consultant.completedProjects })}
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
                                      {t('browseConsultants.consultantCard.moreRegions', { count: consultant.operatingRegions.length - 3 })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3 flex-wrap">
                              <Button 
                                className="flex-1 bg-primary text-primary-foreground" 
                                data-testid={`button-view-profile-${consultant.id}`}
                                asChild
                              >
                                <Link href={`/profile/consultant/${consultant.id}`}>
                                  {t('browseConsultants.consultantCard.viewProfile')}
                                </Link>
                              </Button>
                              {isAuthenticated ? (
                                <Button 
                                  variant="outline"
                                  data-testid={`button-connect-${consultant.id}`}
                                  asChild
                                >
                                  <Link href={`/messages?newChat=${consultant.id}`}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {t('browseConsultants.consultantCard.connect', { defaultValue: 'Connect' })}
                                  </Link>
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline"
                                  onClick={() => setShowAuthDialog(true)}
                                  data-testid={`button-connect-${consultant.id}`}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  {t('browseConsultants.consultantCard.connect', { defaultValue: 'Connect' })}
                                </Button>
                              )}
                              {consultant.availability === 'available' && (
                                <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                                  {t('browseConsultants.consultantCard.available')}
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
                          {t('browseConsultants.pagination.previous')}
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
                          {t('browseConsultants.pagination.next')}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthGateDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title={t('authGate.connectTitle', { defaultValue: 'Sign In to Connect' })}
        description={t('authGate.connectDescription', { defaultValue: 'Create an account or sign in to connect with consultants, send messages, and access all platform features.' })}
      />
    </Layout>
  );
}
