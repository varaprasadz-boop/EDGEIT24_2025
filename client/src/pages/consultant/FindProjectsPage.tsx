import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { UserLayout } from '@/components/UserLayout';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { SearchFilters, SearchFilterValues } from '@/components/SearchFilters';
import { ProjectSearchCard } from '@/components/ProjectSearchCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Job } from '@db/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function FindProjectsPage() {
  const searchParams = new URLSearchParams(useSearch());
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilterValues>({});
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const limit = 12;

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (filters.category) params.set('category', filters.category);
    if (filters.subcategory) params.set('subcategory', filters.subcategory);
    if (filters.minBudget) params.set('minBudget', filters.minBudget.toString());
    if (filters.maxBudget) params.set('maxBudget', filters.maxBudget.toString());
    if (filters.location) params.set('location', filters.location);
    if (filters.status) params.set('status', filters.status);
    if (filters.skills && filters.skills.length > 0) {
      params.set('skills', filters.skills.join(','));
    }
    params.set('sort', sort);
    params.set('limit', limit.toString());
    params.set('offset', ((page - 1) * limit).toString());
    return params.toString();
  };

  const { data, isLoading } = useQuery<{ jobs: Job[]; total: number }>({
    queryKey: ['/api/jobs/search', buildSearchParams()],
  });

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setPage(1);
  };

  const handleFiltersChange = (newFilters: SearchFilterValues) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearAll = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <UserLayout>
      <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Find Projects</h1>
        <p className="text-muted-foreground">
          Discover opportunities that match your skills and expertise
        </p>
      </div>

      <div className="mb-6">
        <GlobalSearchBar
          defaultSearchType="requirements"
          onSearch={handleSearch}
          autoFocus
        />
      </div>

      <div className="flex gap-6">
        <aside className="w-64 flex-shrink-0">
          <Card className="p-4 sticky top-4">
            <SearchFilters
              searchType="requirements"
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearAll={handleClearAll}
            />
          </Card>
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground" data-testid="results-count">
              {isLoading ? 'Searching...' : `${total} projects found`}
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="budget_high">Budget: High to Low</SelectItem>
                <SelectItem value="budget_low">Budget: Low to High</SelectItem>
                <SelectItem value="deadline">Deadline: Soonest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground" data-testid="no-results-message">
                No projects found. Try adjusting your filters or search query.
              </p>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 mb-6" data-testid="projects-grid">
                {jobs.map((job: any) => (
                  <ProjectSearchCard key={job.id} project={job} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground" data-testid="pagination-info">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      </div>
    </UserLayout>
  );
}
