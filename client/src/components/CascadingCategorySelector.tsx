import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId: string | null;
  active: boolean;
  visible: boolean;
  children?: CategoryNode[];
}

interface CascadingCategorySelectorProps {
  value: string | null;
  onChange: (categoryId: string | null, categoryPath?: string) => void;
  disabled?: boolean;
}

export function CascadingCategorySelector({
  value,
  onChange,
  disabled = false,
}: CascadingCategorySelectorProps) {
  const [level0Id, setLevel0Id] = useState<string | null>(null);
  const [level1Id, setLevel1Id] = useState<string | null>(null);
  const [level2Id, setLevel2Id] = useState<string | null>(null);

  // Fetch category tree
  const { data: treeResponse } = useQuery<{ tree: CategoryNode[] }>({
    queryKey: ['/api/categories/tree'],
  });

  const categoryTree = useMemo(() => treeResponse?.tree || [], [treeResponse]);

  // Find category node by ID in tree
  const findCategoryById = (nodes: CategoryNode[], id: string): CategoryNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findCategoryById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Build category path string
  const buildCategoryPath = (categoryId: string | null): string => {
    if (!categoryId || !categoryTree.length) return "";
    
    const category = findCategoryById(categoryTree, categoryId);
    if (!category) return "";

    const path: string[] = [category.name];
    let currentId = category.parentId;

    while (currentId) {
      const parent = findCategoryById(categoryTree, currentId);
      if (!parent) break;
      path.unshift(parent.name);
      currentId = parent.parentId;
    }

    return path.join(" / ");
  };

  // Get level 1 children for selected level 0
  const level1Categories = useMemo(() => {
    if (!level0Id) return [];
    const level0 = findCategoryById(categoryTree, level0Id);
    return level0?.children || [];
  }, [categoryTree, level0Id]);

  // Get level 2 children for selected level 1
  const level2Categories = useMemo(() => {
    if (!level1Id) return [];
    const level1 = findCategoryById(categoryTree, level1Id);
    return level1?.children || [];
  }, [categoryTree, level1Id]);

  // Initialize state from value prop
  useEffect(() => {
    if (value && categoryTree.length > 0) {
      const category = findCategoryById(categoryTree, value);
      if (category) {
        if (category.level === 2) {
          // Find parents
          const parent1 = findCategoryById(categoryTree, category.parentId!);
          if (parent1 && parent1.level === 1) {
            const parent0 = findCategoryById(categoryTree, parent1.parentId!);
            if (parent0 && parent0.level === 0) {
              setLevel0Id(parent0.id);
              setLevel1Id(parent1.id);
              setLevel2Id(category.id);
            }
          }
        } else if (category.level === 1) {
          // Level 1 selection (no children)
          const parent0 = findCategoryById(categoryTree, category.parentId!);
          if (parent0 && parent0.level === 0) {
            setLevel0Id(parent0.id);
            setLevel1Id(category.id);
            setLevel2Id(null);
          }
        }
      }
    }
  }, [value, categoryTree]);

  // Handle level 0 selection
  const handleLevel0Change = (newLevel0Id: string) => {
    setLevel0Id(newLevel0Id);
    setLevel1Id(null);
    setLevel2Id(null);
    onChange(null);
  };

  // Handle level 1 selection
  const handleLevel1Change = (newLevel1Id: string) => {
    setLevel1Id(newLevel1Id);
    setLevel2Id(null);
    
    // Check if level 1 has children
    const level1 = findCategoryById(categoryTree, newLevel1Id);
    const hasChildren = level1?.children && level1.children.length > 0;
    
    // Always emit the selection - let parent decide if it's valid
    const path = buildCategoryPath(newLevel1Id);
    onChange(newLevel1Id, path);
  };

  // Handle level 2 selection (always final selection)
  const handleLevel2Change = (newLevel2Id: string) => {
    setLevel2Id(newLevel2Id);
    const path = buildCategoryPath(newLevel2Id);
    onChange(newLevel2Id, path);
  };

  // Determine the final selected value
  const finalSelectedId = level2Id || level1Id || level0Id;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category-level-0">Primary Category *</Label>
        <Select
          value={level0Id || ""}
          onValueChange={handleLevel0Change}
          disabled={disabled}
        >
          <SelectTrigger id="category-level-0" data-testid="select-category-level-0">
            <SelectValue placeholder="Select primary category" />
          </SelectTrigger>
          <SelectContent>
            {categoryTree.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {level0Id && level1Categories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="category-level-1">
            Subcategory *
            {level1Id && level2Categories.length === 0 && (
              <span className="text-xs text-muted-foreground ml-2">(No further subcategories available)</span>
            )}
          </Label>
          <Select
            value={level1Id || ""}
            onValueChange={handleLevel1Change}
            disabled={disabled}
          >
            <SelectTrigger id="category-level-1" data-testid="select-category-level-1">
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              {level1Categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                  {cat.name}
                  {!cat.children || cat.children.length === 0 ? " (Leaf)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {level1Id && level2Categories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="category-level-2">Specific Service *</Label>
          <Select
            value={level2Id || ""}
            onValueChange={handleLevel2Change}
            disabled={disabled}
          >
            <SelectTrigger id="category-level-2" data-testid="select-category-level-2">
              <SelectValue placeholder="Select specific service" />
            </SelectTrigger>
            <SelectContent>
              {level2Categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {finalSelectedId && (
        <div className="text-sm text-muted-foreground" data-testid="text-category-path">
          Selected: {buildCategoryPath(finalSelectedId)}
        </div>
      )}
    </div>
  );
}
