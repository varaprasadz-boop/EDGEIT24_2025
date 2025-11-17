import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Trash2, Bell, BellOff, Loader2 } from 'lucide-react';

interface SavedSearchesPanelProps {
  searchType?: 'requirements' | 'consultants';
  onLoadSearch?: (filters: any) => void;
}

export function SavedSearchesPanel({ searchType, onLoadSearch }: SavedSearchesPanelProps) {
  const { toast } = useToast();

  const { data: savedSearchesData, isLoading } = useQuery({
    queryKey: ['/api/saved-searches'],
  });

  const savedSearches = ((savedSearchesData as any)?.savedSearches || [])
    .filter((search: any) => !searchType || search.searchType === searchType);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/saved-searches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast({
        title: 'Success',
        description: 'Saved search deleted',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete saved search',
      });
    },
  });

  const toggleAlertsMutation = useMutation({
    mutationFn: async ({ id, emailAlerts }: { id: string; emailAlerts: boolean }) => {
      return apiRequest('PUT', `/api/saved-searches/${id}`, { emailAlerts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast({
        title: 'Success',
        description: 'Email alerts updated',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update email alerts',
      });
    },
  });

  const handleLoadSearch = (search: any) => {
    if (onLoadSearch) {
      onLoadSearch(search.filters || {});
    }
  };

  const getFilterSummary = (filters: any) => {
    const parts: string[] = [];
    if (filters.category) parts.push(filters.category);
    if (filters.minBudget || filters.maxBudget) {
      parts.push(`Budget: ${filters.minBudget || 0}-${filters.maxBudget || '∞'}`);
    }
    if (filters.location) parts.push(filters.location);
    if (filters.skills && filters.skills.length > 0) {
      parts.push(`${filters.skills.length} skills`);
    }
    return parts.join(' • ') || 'No filters';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (savedSearches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Saved Searches</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No saved searches yet. Save your search filters to quickly access them later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="saved-searches-panel">
      <CardHeader>
        <h3 className="font-semibold">Saved Searches</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {savedSearches.map((search: any) => (
          <div
            key={search.id}
            className="p-3 border rounded-md space-y-2 hover-elevate"
            data-testid={`saved-search-${search.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{search.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {getFilterSummary(search.filters)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleAlertsMutation.mutate({ id: search.id, emailAlerts: !search.emailAlerts })}
                  title={search.emailAlerts ? 'Disable email alerts' : 'Enable email alerts'}
                  data-testid={`button-toggle-alerts-${search.id}`}
                >
                  {search.emailAlerts ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(search.id)}
                  data-testid={`button-delete-search-${search.id}`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoadSearch(search)}
              className="w-full"
              data-testid={`button-load-search-${search.id}`}
            >
              <Search className="h-3 w-3 mr-2" />
              Load this search
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
