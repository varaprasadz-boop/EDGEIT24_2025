import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronRight, Star, AlertCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  icon: string | null;
  level: number;
  parentId: string | null;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

interface CategorySelectorProps {
  selectedCategories: string[];
  primaryCategoryId: string | null;
  onSelectionChange: (categoryIds: string[], primaryId: string | null) => void;
  maxSelections?: number;
}

export function CategorySelector({
  selectedCategories,
  primaryCategoryId,
  onSelectionChange,
  maxSelections = 10,
}: CategorySelectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch category tree (public endpoint)
  const { data, isLoading } = useQuery<{ tree: CategoryNode[] }>({
    queryKey: ['/api/categories/tree'],
  });

  // Auto-expand nodes that contain selected categories
  useEffect(() => {
    if (data?.tree && selectedCategories.length > 0) {
      const newExpanded = new Set(expandedNodes);
      
      const findParents = (nodes: CategoryNode[], targetIds: string[], parents: string[] = []): void => {
        nodes.forEach(node => {
          const currentPath = [...parents, node.id];
          
          if (targetIds.includes(node.id)) {
            // Expand all parents of this selected node
            parents.forEach(parentId => newExpanded.add(parentId));
          }
          
          if (node.children.length > 0) {
            findParents(node.children, targetIds, currentPath);
          }
        });
      };
      
      findParents(data.tree, selectedCategories);
      setExpandedNodes(newExpanded);
    }
  }, [data?.tree, selectedCategories.length]);

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleCategoryToggle = (categoryId: string, isChecked: boolean) => {
    let newSelected: string[];
    
    if (isChecked) {
      // Check if max selections reached
      if (selectedCategories.length >= maxSelections) {
        return;
      }
      newSelected = [...selectedCategories, categoryId];
    } else {
      newSelected = selectedCategories.filter(id => id !== categoryId);
      
      // If unchecking the primary category, clear primary
      if (categoryId === primaryCategoryId) {
        onSelectionChange(newSelected, null);
        return;
      }
    }
    
    onSelectionChange(newSelected, primaryCategoryId);
  };

  const handleSetPrimary = (categoryId: string) => {
    // Can only set primary if category is selected
    if (!selectedCategories.includes(categoryId)) {
      return;
    }
    
    const newPrimary = categoryId === primaryCategoryId ? null : categoryId;
    onSelectionChange(selectedCategories, newPrimary);
  };

  const renderCategoryNode = (node: CategoryNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedCategories.includes(node.id);
    const isPrimary = primaryCategoryId === node.id;
    const hasChildren = node.children.length > 0;
    const IconComponent = node.icon ? (LucideIcons as any)[node.icon] : null;

    return (
      <div key={node.id} className="space-y-1">
        <div 
          className={`flex items-center gap-2 py-2 px-3 rounded-md hover-elevate ${
            depth === 0 ? 'font-medium' : ''
          }`}
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleExpanded(node.id)}
              className="p-0.5 hover-elevate rounded"
              data-testid={`button-toggle-category-${node.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-5" />}
          
          <Checkbox
            id={`category-${node.id}`}
            checked={isSelected}
            onCheckedChange={(checked) => handleCategoryToggle(node.id, checked as boolean)}
            disabled={!isSelected && selectedCategories.length >= maxSelections}
            data-testid={`checkbox-category-${node.id}`}
          />
          
          <Label
            htmlFor={`category-${node.id}`}
            className="flex items-center gap-2 flex-1 cursor-pointer"
          >
            {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
            <span>{node.name}</span>
            {depth === 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                L{node.level}
              </Badge>
            )}
          </Label>
          
          {isSelected && (
            <button
              type="button"
              onClick={() => handleSetPrimary(node.id)}
              className={`p-1 rounded hover-elevate ${
                isPrimary ? 'text-primary' : 'text-muted-foreground'
              }`}
              title={isPrimary ? "Primary service" : "Set as primary service"}
              data-testid={`button-primary-${node.id}`}
            >
              <Star className={`h-4 w-4 ${isPrimary ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children.map(child => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (!data?.tree || data.tree.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No categories available. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Select your service categories</p>
          <p className="text-xs text-muted-foreground">
            Choose up to {maxSelections} categories. Click the star to set your primary service.
          </p>
        </div>
        <Badge variant="outline" data-testid="text-category-count">
          {selectedCategories.length} / {maxSelections}
        </Badge>
      </div>

      {selectedCategories.length > 0 && !primaryCategoryId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a primary service category by clicking the star icon.
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 max-h-96 overflow-y-auto">
        <div className="space-y-1">
          {data.tree.map(node => renderCategoryNode(node, 0))}
        </div>
      </Card>
    </div>
  );
}
