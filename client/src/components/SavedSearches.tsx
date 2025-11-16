import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Trash2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  searchType: 'job' | 'consultant';
  filters: Record<string, any>;
  createdAt: string;
}

interface SavedSearchesProps {
  searchType: 'job' | 'consultant';
  currentFilters: Record<string, any>;
  onLoadSearch: (filters: Record<string, any>) => void;
}

export function SavedSearches({ searchType, currentFilters, onLoadSearch }: SavedSearchesProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const { toast } = useToast();

  // Fetch saved searches
  const { data: savedSearchesData } = useQuery<{ savedSearches: SavedSearch[] }>({
    queryKey: ['/api/saved-searches'],
  });

  const savedSearches = (savedSearchesData?.savedSearches || []).filter(s => s.searchType === searchType);

  // Save search mutation
  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('POST', '/api/saved-searches', {
        name,
        searchType,
        filters: currentFilters,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast({
        title: "Success",
        description: "Search saved successfully",
      });
      setSaveDialogOpen(false);
      setSearchName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save search",
        variant: "destructive",
      });
    },
  });

  // Delete search mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/saved-searches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-searches'] });
      toast({
        title: "Success",
        description: "Search deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete search",
        variant: "destructive",
      });
    },
  });

  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search name",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(searchName);
  };

  const handleLoadSearch = (search: SavedSearch) => {
    onLoadSearch(search.filters);
    toast({
      title: "Search Loaded",
      description: `Loaded "${search.name}"`,
    });
  };

  const handleDeleteSearch = (id: string, name: string) => {
    if (confirm(`Delete saved search "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Check if there are any meaningful filters (exclude structural defaults like limit/offset)
  const hasActiveFilters = Object.entries(currentFilters).some(([key, v]) => {
    // Ignore pagination defaults
    if (key === 'limit' || key === 'offset') return false;
    // Check for non-empty values
    return v !== null && v !== "" && v !== undefined && (Array.isArray(v) ? v.length > 0 : true);
  });

  return (
    <div className="flex items-center gap-2">
      {/* Save Search Button */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasActiveFilters}
            data-testid="button-save-search"
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Save Search
          </Button>
        </DialogTrigger>
        <DialogContent data-testid="dialog-save-search">
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give your search a name to easily load it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., Senior React Developer Jobs"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                data-testid="input-search-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              data-testid="button-cancel-save"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSearch}
              disabled={saveMutation.isPending}
              data-testid="button-confirm-save"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load/Manage Searches Dropdown */}
      {savedSearches.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-load-search">
              Saved Searches
              <Badge variant="secondary" className="ml-2">
                {savedSearches.length}
              </Badge>
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64" data-testid="menu-saved-searches">
            {savedSearches.map((search) => (
              <DropdownMenuItem
                key={search.id}
                className="flex items-center justify-between gap-2"
                onSelect={() => handleLoadSearch(search)}
                data-testid={`menu-item-search-${search.id}`}
              >
                <span className="truncate flex-1">{search.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSearch(search.id, search.name);
                  }}
                  data-testid={`button-delete-search-${search.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setManageDialogOpen(true)}
              className="text-primary"
              data-testid="menu-item-manage-searches"
            >
              Manage Saved Searches
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Manage Searches Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent data-testid="dialog-manage-searches">
          <DialogHeader>
            <DialogTitle>Manage Saved Searches</DialogTitle>
            <DialogDescription>
              Load or delete your saved searches
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {savedSearches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No saved searches yet
              </p>
            ) : (
              savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-md border hover-elevate"
                  data-testid={`saved-search-${search.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{search.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Saved {new Date(search.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleLoadSearch(search);
                        setManageDialogOpen(false);
                      }}
                      data-testid={`button-load-${search.id}`}
                    >
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSearch(search.id, search.name)}
                      data-testid={`button-delete-${search.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManageDialogOpen(false)}
              data-testid="button-close-manage"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
