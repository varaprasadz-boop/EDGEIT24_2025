import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Clock, Users } from "lucide-react";
import { Label } from "@/components/ui/label";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId: string | null;
  children?: CategoryNode[];
}

interface Consultant {
  id: string;
  fullName: string;
  title: string;
  bio: string;
  hourlyRate: string | null;
  experience: string;
  rating: string;
  totalReviews: number;
  completedProjects: number;
}

export default function BrowseConsultants() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const categoryParam = searchParams.get('category');
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryParam);

  useEffect(() => {
    setSelectedCategoryId(categoryParam);
  }, [categoryParam]);

  // Fetch category tree
  const { data: treeResponse } = useQuery<{ tree: CategoryNode[] }>({
    queryKey: ['/api/categories/tree'],
  });

  const categoryTree = treeResponse?.tree || [];

  // Placeholder: Fetch consultants (API endpoint to be implemented)
  const { data: consultants = [], isLoading } = useQuery<Consultant[]>({
    queryKey: ['/api/consultants', selectedCategoryId],
    queryFn: async () => {
      // Placeholder - actual implementation would filter by category
      return [];
    },
  });

  // Flatten category tree for dropdown
  const flattenCategories = (nodes: CategoryNode[], depth: number = 0): { id: string; name: string; depth: number }[] => {
    return nodes.flatMap(node => [
      { id: node.id, name: node.name, depth },
      ...(node.children ? flattenCategories(node.children, depth + 1) : [])
    ]);
  };

  const allCategories = flattenCategories(categoryTree);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-browse-consultants-title">
              Find Consultants
            </h1>
            <p className="text-muted-foreground" data-testid="text-browse-consultants-subtitle">
              Browse skilled IT professionals
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-filter">Filter by Service Category</Label>
            <Select value={selectedCategoryId || "all"} onValueChange={(value) => setSelectedCategoryId(value === "all" ? null : value)}>
              <SelectTrigger id="category-filter" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                    {"  ".repeat(cat.depth)}
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-coming-soon">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Consultant Listings Coming Soon</p>
              <p className="text-sm">We're working on bringing you a comprehensive directory of skilled IT professionals</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
