import { useState } from 'react';
import { X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';

export interface SearchFilterValues {
  category?: string;
  subcategory?: string;
  skills?: string[];
  minBudget?: number;
  maxBudget?: number;
  location?: string;
  minRating?: number;
  availability?: boolean;
  certifications?: string[];
  languages?: string[];
  employeeCount?: string;
  experienceYears?: number;
  status?: string;
}

interface SearchFiltersProps {
  searchType: 'requirements' | 'consultants';
  filters: SearchFilterValues;
  onFiltersChange: (filters: SearchFilterValues) => void;
  onClearAll?: () => void;
}

export function SearchFilters({ searchType, filters, onFiltersChange, onClearAll }: SearchFiltersProps) {
  const [budgetOpen, setBudgetOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [locationOpen, setLocationOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);

  const updateFilter = (key: keyof SearchFilterValues, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleSkill = (skill: string) => {
    const current = filters.skills || [];
    const updated = current.includes(skill)
      ? current.filter(s => s !== skill)
      : [...current, skill];
    updateFilter('skills', updated);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.subcategory) count++;
    if (filters.skills && filters.skills.length > 0) count++;
    if (filters.minBudget || filters.maxBudget) count++;
    if (filters.location) count++;
    if (filters.minRating) count++;
    if (filters.availability) count++;
    if (filters.status) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  const commonSkills = [
    'React', 'Node.js', 'Python', 'Java', 'TypeScript', 'AWS',
    'Database Design', 'UI/UX Design', 'Mobile Development', 'DevOps'
  ];

  const categories = [
    'Software Development',
    'Web Development',
    'Mobile App Development',
    'UI/UX Design',
    'DevOps & Cloud',
    'Data Science',
    'Cybersecurity',
    'IT Consulting'
  ];

  const locations = [
    'Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina',
    'Remote', 'Onsite', 'Hybrid'
  ];

  return (
    <div className="w-full space-y-4" data-testid="search-filters">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <h3 className="font-semibold">Filters</h3>
          {activeCount > 0 && (
            <Badge variant="secondary" data-testid="active-filter-count">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            data-testid="button-clear-all-filters"
          >
            Clear all
          </Button>
        )}
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="active-filters-chips">
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              {filters.category}
              <button onClick={() => updateFilter('category', undefined)} data-testid="chip-remove-category">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.skills?.map(skill => (
            <Badge key={skill} variant="secondary" className="gap-1">
              {skill}
              <button onClick={() => toggleSkill(skill)} data-testid={`chip-remove-skill-${skill}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.location && (
            <Badge variant="secondary" className="gap-1">
              {filters.location}
              <button onClick={() => updateFilter('location', undefined)} data-testid="chip-remove-location">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label htmlFor="filter-category">Category</Label>
          <Select
            value={filters.category || ''}
            onValueChange={(value) => updateFilter('category', value || undefined)}
          >
            <SelectTrigger id="filter-category" data-testid="select-category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {searchType === 'requirements' && (
          <div>
            <Label htmlFor="filter-status">Status</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => updateFilter('status', value || undefined)}
            >
              <SelectTrigger id="filter-status" data-testid="select-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Collapsible open={budgetOpen} onOpenChange={setBudgetOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2" data-testid="collapsible-budget">
            <Label>Budget Range (SAR)</Label>
            <ChevronDown className={`h-4 w-4 transition-transform ${budgetOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="min-budget" className="text-xs">Min</Label>
                <Input
                  id="min-budget"
                  type="number"
                  placeholder="0"
                  value={filters.minBudget || ''}
                  onChange={(e) => updateFilter('minBudget', e.target.value ? Number(e.target.value) : undefined)}
                  data-testid="input-min-budget"
                />
              </div>
              <div>
                <Label htmlFor="max-budget" className="text-xs">Max</Label>
                <Input
                  id="max-budget"
                  type="number"
                  placeholder="No limit"
                  value={filters.maxBudget || ''}
                  onChange={(e) => updateFilter('maxBudget', e.target.value ? Number(e.target.value) : undefined)}
                  data-testid="input-max-budget"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={skillsOpen} onOpenChange={setSkillsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2" data-testid="collapsible-skills">
            <Label>Skills & Technologies</Label>
            <ChevronDown className={`h-4 w-4 transition-transform ${skillsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {commonSkills.map(skill => (
              <div key={skill} className="flex items-center space-x-2">
                <Checkbox
                  id={`skill-${skill}`}
                  checked={filters.skills?.includes(skill) || false}
                  onCheckedChange={() => toggleSkill(skill)}
                  data-testid={`checkbox-skill-${skill}`}
                />
                <label htmlFor={`skill-${skill}`} className="text-sm cursor-pointer">
                  {skill}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2" data-testid="collapsible-location">
            <Label>Location</Label>
            <ChevronDown className={`h-4 w-4 transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Select
              value={filters.location || ''}
              onValueChange={(value) => updateFilter('location', value || undefined)}
            >
              <SelectTrigger data-testid="select-location">
                <SelectValue placeholder="Any location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any location</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CollapsibleContent>
        </Collapsible>

        {searchType === 'consultants' && (
          <Collapsible open={ratingOpen} onOpenChange={setRatingOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2" data-testid="collapsible-rating">
              <Label>Minimum Rating</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${ratingOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <Slider
                  value={[filters.minRating || 0]}
                  onValueChange={([value]) => updateFilter('minRating', value > 0 ? value : undefined)}
                  max={5}
                  step={0.5}
                  className="flex-1"
                  data-testid="slider-min-rating"
                />
                <span className="text-sm font-medium w-12">
                  {filters.minRating ? `${filters.minRating}+` : 'Any'}
                </span>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {searchType === 'consultants' && (
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="availability"
              checked={filters.availability || false}
              onCheckedChange={(checked) => updateFilter('availability', checked)}
              data-testid="checkbox-availability"
            />
            <label htmlFor="availability" className="text-sm cursor-pointer">
              Available now
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
