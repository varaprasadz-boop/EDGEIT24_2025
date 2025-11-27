import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Loader2, FileText } from "lucide-react";

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch knowledge base articles from CMS
  const { data: articles, isLoading } = useQuery({
    queryKey: ['/api/content/pages'],
    queryFn: async () => {
      const response = await fetch('/api/content/pages?status=published', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch articles');
      const data = await response.json();
      // Filter for knowledge base articles (you can tag pages as 'guide', 'tutorial', 'documentation' in the CMS)
      return data.filter((page: any) => 
        page.category?.toLowerCase().includes('guide') || 
        page.category?.toLowerCase().includes('tutorial') ||
        page.category?.toLowerCase().includes('documentation') ||
        page.tags?.toLowerCase().includes('guide')
      );
    },
  });

  // Group articles by category
  const groupedArticles = articles?.reduce((acc: any, article: any) => {
    const category = article.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(article);
    return acc;
  }, {});

  // Filter articles based on search
  const filteredArticles = articles?.filter((article: any) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.metaDescription?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-kb-title">
          Knowledge Base
        </h1>
        <p className="text-muted-foreground" data-testid="text-kb-subtitle">
          Browse comprehensive guides and documentation
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8 max-w-2xl">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          type="text"
          placeholder="Search knowledge base..."
          className="pl-12"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-kb"
        />
      </div>

      {/* Articles */}
      {!articles || articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No articles found. Knowledge base is being updated.
            </p>
          </CardContent>
        </Card>
      ) : searchQuery ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Found {filteredArticles?.length || 0} results
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles?.map((article: any) => (
              <Link key={article.id} href={`/legal/${article.slug}`}>
                <Card className="h-full hover-elevate active-elevate-2 cursor-pointer transition-all" data-testid={`card-article-${article.slug}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <CardTitle className="text-base mb-2">{article.title}</CardTitle>
                        {article.category && (
                          <Badge variant="secondary" className="text-xs">
                            {article.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {article.metaDescription && (
                    <CardContent>
                      <CardDescription className="line-clamp-2">
                        {article.metaDescription}
                      </CardDescription>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedArticles || {}).map(([category, categoryArticles]: [string, any]) => (
            <div key={category}>
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold" data-testid={`text-category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                  {category}
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryArticles.map((article: any) => (
                  <Link key={article.id} href={`/legal/${article.slug}`}>
                    <Card className="h-full hover-elevate active-elevate-2 cursor-pointer transition-all" data-testid={`card-article-${article.slug}`}>
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                          <CardTitle className="text-base">{article.title}</CardTitle>
                        </div>
                      </CardHeader>
                      {article.metaDescription && (
                        <CardContent>
                          <CardDescription className="line-clamp-2">
                            {article.metaDescription}
                          </CardDescription>
                        </CardContent>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </UserLayout>
  );
}
