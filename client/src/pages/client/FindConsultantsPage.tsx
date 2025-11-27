import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { UserLayout } from '@/components/UserLayout';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { SearchFilters, SearchFilterValues } from '@/components/SearchFilters';
import { ConsultantSearchCard } from '@/components/ConsultantSearchCard';
import { SaveToListDialog } from '@/components/SaveToListDialog';
import { InviteToBidDialog } from '@/components/InviteToBidDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, GitCompare } from 'lucide-react';

export default function FindConsultantsPage() {
  const searchParams = new URLSearchParams(useSearch());
  const initialQuery = searchParams.get('q') || '';
  const [, navigate] = useLocation();
  
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilterValues>({});
  const [sort, setSort] = useState('rating');
  const [page, setPage] = useState(1);
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [saveToListOpen, setSaveToListOpen] = useState(false);
  const [inviteToBidOpen, setInviteToBidOpen] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const limit = 12;

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (filters.category) params.set('category', filters.category);
    if (filters.subcategory) params.set('subcategory', filters.subcategory);
    if (filters.minBudget) params.set('minPricing', filters.minBudget.toString());
    if (filters.maxBudget) params.set('maxPricing', filters.maxBudget.toString());
    if (filters.location) params.set('location', filters.location);
    if (filters.minRating) params.set('minRating', filters.minRating.toString());
    if (filters.availability) params.set('availability', 'true');
    if (filters.skills && filters.skills.length > 0) {
      params.set('skills', filters.skills.join(','));
    }
    params.set('sort', sort);
    params.set('limit', limit.toString());
    params.set('offset', ((page - 1) * limit).toString());
    return params.toString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['/api/consultants/search', buildSearchParams()],
  });

  const consultants = (data as any)?.consultants || [];
  const total = (data as any)?.total || 0;
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

  const handleSaveToList = (consultantId: string) => {
    setSelectedConsultantId(consultantId);
    setSaveToListOpen(true);
  };

  const handleInviteToBid = (consultantId: string) => {
    setSelectedConsultantId(consultantId);
    setInviteToBidOpen(true);
  };

  const handleSendMessage = (consultantId: string) => {
    navigate(`/client/messages?userId=${consultantId}`);
  };

  return (
    <UserLayout>
      <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Find Consultants</h1>
        <p className="text-muted-foreground">
          Discover qualified IT professionals for your projects
        </p>
      </div>

      <div className="mb-6">
        <GlobalSearchBar
          defaultSearchType="consultants"
          onSearch={handleSearch}
          autoFocus
        />
      </div>

      <div className="flex gap-6">
        <aside className="w-64 flex-shrink-0">
          <Card className="p-4 sticky top-4">
            <SearchFilters
              searchType="consultants"
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearAll={handleClearAll}
            />
          </Card>
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground" data-testid="results-count">
              {isLoading ? 'Searching...' : `${total} consultants found`}
            </div>
            <div className="flex items-center gap-2">
              {selectedConsultants.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/client/compare-consultants?ids=${selectedConsultants.join(',')}`)}
                  data-testid="button-compare-selected"
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare ({selectedConsultants.length})
                </Button>
              )}
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-48" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="reviews">Most Reviews</SelectItem>
                  <SelectItem value="pricing_low">Price: Low to High</SelectItem>
                  <SelectItem value="pricing_high">Price: High to Low</SelectItem>
                  <SelectItem value="success_rate">Success Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : consultants.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground" data-testid="no-results-message">
                No consultants found. Try adjusting your filters or search query.
              </p>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 mb-6" data-testid="consultants-grid">
                {consultants.map((consultant: any) => (
                  <ConsultantSearchCard
                    key={consultant.id}
                    consultant={consultant}
                    onSaveToList={handleSaveToList}
                    onInviteToBid={handleInviteToBid}
                    onSendMessage={handleSendMessage}
                  />
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

      {selectedConsultantId && (
        <>
          <SaveToListDialog
            consultantId={selectedConsultantId}
            open={saveToListOpen}
            onOpenChange={setSaveToListOpen}
          />
          <InviteToBidDialog
            consultantId={selectedConsultantId}
            open={inviteToBidOpen}
            onOpenChange={setInviteToBidOpen}
          />
        </>
      )}
      </div>
    </UserLayout>
  );
}
