import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  icon: string;
  level: number;
  parentId: string | null;
  displayOrder: number;
  children?: Category[];
}

interface CategoryTreeSelectorProps {
  value?: string[];
  onChange?: (selectedIds: string[]) => void;
  disabled?: boolean;
  testId?: string;
}

function CategoryNode({
  category,
  selectedIds,
  onToggle,
  disabled,
  testId,
}: {
  category: Category;
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  testId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const isChecked = selectedIds.includes(category.id);

  const levelIndent = category.level * 24;

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-start gap-2 py-2 rounded-md hover-elevate",
          disabled && "opacity-50"
        )}
        style={{ paddingLeft: `${levelIndent}px` }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 p-0.5 hover-elevate rounded"
            disabled={disabled}
            data-testid={`${testId}-toggle-${category.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
        <div className="flex items-start gap-2 flex-1">
          <Checkbox
            id={`cat-${category.id}`}
            checked={isChecked}
            onCheckedChange={() => onToggle(category.id)}
            disabled={disabled}
            data-testid={`${testId}-checkbox-${category.id}`}
            className="mt-1"
          />
          <Label
            htmlFor={`cat-${category.id}`}
            className={cn(
              "flex-1 cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-2">
              {category.icon && (
                <span className="text-lg" aria-hidden="true">
                  {category.icon}
                </span>
              )}
              <div className="flex-1">
                <div className={cn(
                  "font-medium",
                  category.level === 0 && "text-base",
                  category.level === 1 && "text-sm",
                  category.level === 2 && "text-sm text-muted-foreground"
                )}>
                  {category.name}
                </div>
                {category.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {category.description}
                  </div>
                )}
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                category.level === 0 && "bg-primary/10 text-primary",
                category.level === 1 && "bg-accent text-accent-foreground",
                category.level === 2 && "bg-muted text-muted-foreground"
              )}>
                L{category.level}
              </span>
            </div>
          </Label>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="w-full">
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              selectedIds={selectedIds}
              onToggle={onToggle}
              disabled={disabled}
              testId={testId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTreeSelector({
  value = [],
  onChange,
  disabled = false,
  testId = "category-tree-selector",
}: CategoryTreeSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(value);

  const { data, isLoading, error } = useQuery<{ tree: Category[] }>({
    queryKey: ['/api/categories/tree'],
  });

  useEffect(() => {
    setSelectedIds(value);
  }, [value]);

  const handleToggle = (id: string) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];

    setSelectedIds(newSelectedIds);
    onChange?.(newSelectedIds);
  };

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid={`${testId}-loading`}>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${testId}-error`}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load categories. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.tree || data.tree.length === 0) {
    return (
      <Alert data-testid={`${testId}-empty`}>
        <AlertDescription>
          No categories available.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-1" data-testid={testId}>
      {data.tree.map((category) => (
        <CategoryNode
          key={category.id}
          category={category}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          disabled={disabled}
          testId={testId}
        />
      ))}
      
      {selectedIds.length > 0 && (
        <div className="mt-4 p-3 rounded-md bg-muted" data-testid={`${testId}-selection-count`}>
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} {selectedIds.length === 1 ? 'category' : 'categories'} selected
          </p>
        </div>
      )}
    </div>
  );
}
