import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Label } from "@/components/ui/label";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "text" | "date";
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  filters?: FilterConfig[];
  onFiltersChange?: (filters: Record<string, string>) => void;
  onReset?: () => void;
  showAdvancedFilters?: boolean;
}

export function FilterBar({
  searchPlaceholder,
  onSearchChange,
  searchValue = "",
  filters = [],
  onFiltersChange,
  onReset,
  showAdvancedFilters = false,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters };
    if (value === "all" || value === "") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setActiveFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleReset = () => {
    setActiveFilters({});
    onFiltersChange?.({});
    onReset?.();
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  // Split filters into quick (first 2) and advanced (rest)
  const quickFilters = filters.slice(0, 2);
  const advancedFilters = filters.slice(2);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder || t('common.search')}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Quick Filters */}
        {quickFilters.map((filter) => (
          <div key={filter.key} className="min-w-[150px]">
            {filter.type === "select" && filter.options ? (
              <Select
                value={activeFilters[filter.key] || "all"}
                onValueChange={(value) => handleFilterChange(filter.key, value)}
              >
                <SelectTrigger data-testid={`select-${filter.key}`}>
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ))}

        {/* Advanced Filters Button */}
        {showAdvancedFilters && advancedFilters.length > 0 && (
          <Sheet open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="default"
                data-testid="button-advanced-filters"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {t('common.advancedFilters')}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{t('common.advancedFilters')}</SheetTitle>
                <SheetDescription>
                  {t('common.filters')}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                {advancedFilters.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <Label htmlFor={filter.key}>{filter.label}</Label>
                    {filter.type === "select" && filter.options ? (
                      <Select
                        value={activeFilters[filter.key] || "all"}
                        onValueChange={(value) =>
                          handleFilterChange(filter.key, value)
                        }
                      >
                        <SelectTrigger id={filter.key}>
                          <SelectValue placeholder={filter.label} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('common.all')}</SelectItem>
                          {filter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : filter.type === "text" ? (
                      <Input
                        id={filter.key}
                        value={activeFilters[filter.key] || ""}
                        onChange={(e) =>
                          handleFilterChange(filter.key, e.target.value)
                        }
                        placeholder={filter.placeholder}
                      />
                    ) : null}
                  </div>
                ))}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1"
                    data-testid="button-reset-filters"
                  >
                    {t('common.reset')}
                  </Button>
                  <Button
                    onClick={() => setIsAdvancedOpen(false)}
                    className="flex-1"
                    data-testid="button-apply-filters"
                  >
                    {t('common.apply')}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {t('common.filters')}:
          </span>
          {Object.entries(activeFilters).map(([key, value]) => {
            const filter = filters.find((f) => f.key === key);
            const option = filter?.options?.find((o) => o.value === value);
            return (
              <div
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
                data-testid={`filter-pill-${key}`}
              >
                <span>
                  {filter?.label}: {option?.label || value}
                </span>
                <button
                  onClick={() => handleFilterChange(key, "")}
                  className="hover-elevate rounded-sm p-0.5"
                  data-testid={`button-remove-${key}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
