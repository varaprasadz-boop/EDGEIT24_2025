import { useState, useEffect, useRef } from 'react';
import { Search, Clock, X, Briefcase, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface GlobalSearchBarProps {
  defaultSearchType?: 'requirements' | 'consultants';
  onSearchTypeChange?: (type: 'requirements' | 'consultants') => void;
  onSearch?: (query: string, searchType: 'requirements' | 'consultants') => void;
  autoFocus?: boolean;
}

export function GlobalSearchBar({ 
  defaultSearchType = 'requirements',
  onSearchTypeChange,
  onSearch,
  autoFocus = false
}: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'requirements' | 'consultants'>(defaultSearchType);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useQuery({
    queryKey: ['/api/search/suggestions', query, searchType],
    enabled: showSuggestions && query.length > 0,
  });

  const { data: historyData } = useQuery({
    queryKey: ['/api/search/history'],
    enabled: showSuggestions && query.length === 0,
  });

  const createHistoryMutation = useMutation({
    mutationFn: async (data: { searchType: string; query?: string; resultsCount: number }) => {
      return apiRequest('POST', '/api/search/history', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
    }
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/search/history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/history'] });
    }
  });

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchTypeToggle = (type: 'requirements' | 'consultants') => {
    setSearchType(type);
    onSearchTypeChange?.(type);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      createHistoryMutation.mutate({
        searchType,
        query: query.trim(),
        resultsCount: 0
      });

      if (onSearch) {
        onSearch(query.trim(), searchType);
      } else {
        const path = searchType === 'requirements' 
          ? `/consultant/find-projects?q=${encodeURIComponent(query.trim())}`
          : `/client/find-consultants?q=${encodeURIComponent(query.trim())}`;
        navigate(path);
      }
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestionQuery: string) => {
    setQuery(suggestionQuery);
    setShowSuggestions(false);
    
    createHistoryMutation.mutate({
      searchType,
      query: suggestionQuery,
      resultsCount: 0
    });

    if (onSearch) {
      onSearch(suggestionQuery, searchType);
    } else {
      const path = searchType === 'requirements' 
        ? `/consultant/find-projects?q=${encodeURIComponent(suggestionQuery)}`
        : `/client/find-consultants?q=${encodeURIComponent(suggestionQuery)}`;
      navigate(path);
    }
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteHistoryMutation.mutate(id);
  };

  const recentSearches = (historyData as any)?.history
    ?.filter((h: any) => h.searchType === searchType && h.query)
    .slice(0, 5) || [];

  const suggestionsList = (suggestions as any)?.recentSearches || [];

  return (
    <div ref={wrapperRef} className="relative w-full" data-testid="global-search-bar">
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-input overflow-hidden">
          <Button
            type="button"
            variant={searchType === 'requirements' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleSearchTypeToggle('requirements')}
            className="rounded-none border-r"
            data-testid="button-search-type-requirements"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Projects
          </Button>
          <Button
            type="button"
            variant={searchType === 'consultants' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleSearchTypeToggle('consultants')}
            className="rounded-none"
            data-testid="button-search-type-consultants"
          >
            <Users className="h-4 w-4 mr-2" />
            Consultants
          </Button>
        </div>

        <div className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={searchType === 'requirements' ? 'Search for projects...' : 'Search for consultants...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="pl-10 pr-10"
              data-testid="input-search-query"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {showSuggestions && (query.length > 0 || recentSearches.length > 0) && (
            <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto" data-testid="search-suggestions-dropdown">
              <div className="p-2">
                {query.length > 0 && suggestionsList.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Recent Searches</p>
                    {suggestionsList.map((suggestion: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-2 hover-elevate rounded-md flex items-center gap-2"
                        data-testid={`suggestion-item-${index}`}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}

                {query.length === 0 && recentSearches.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Recent Searches</p>
                    {recentSearches.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-2 hover-elevate rounded-md"
                      >
                        <button
                          onClick={() => handleSuggestionClick(item.query)}
                          className="flex-1 text-left flex items-center gap-2"
                          data-testid={`history-item-${item.id}`}
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{item.query}</span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="h-6 w-6"
                          data-testid={`button-delete-history-${item.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSearch}
          disabled={!query.trim()}
          data-testid="button-search-submit"
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {searchType === 'consultants' && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Filter by skills, rating, location
          </Badge>
          <Badge variant="outline" className="text-xs">
            Sort by relevance, rating, price
          </Badge>
        </div>
      )}
    </div>
  );
}
