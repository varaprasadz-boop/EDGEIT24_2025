import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Search, HelpCircle, Loader2 } from "lucide-react";

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch FAQ content from CMS
  const { data: faqPages, isLoading } = useQuery({
    queryKey: ['/api/content/pages'],
    queryFn: async () => {
      const response = await fetch('/api/content/pages?status=published', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch FAQ pages');
      const data = await response.json();
      // Filter for FAQ-tagged pages (you can tag pages in the CMS admin)
      return data.filter((page: any) => 
        page.category?.toLowerCase().includes('faq') || 
        page.tags?.toLowerCase().includes('faq')
      );
    },
  });

  // Group FAQs by category
  const groupedFAQs = faqPages?.reduce((acc: any, page: any) => {
    const category = page.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(page);
    return acc;
  }, {});

  // Filter FAQs based on search
  const filteredFAQs = faqPages?.filter((page: any) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-faq-title">
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground" data-testid="text-faq-subtitle">
          Find answers to common questions about EDGEIT24
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          type="text"
          placeholder="Search FAQs..."
          className="pl-12"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-faq"
        />
      </div>

      {/* FAQ Content */}
      {!faqPages || faqPages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No FAQ articles found. Please check back later.
            </p>
          </CardContent>
        </Card>
      ) : searchQuery ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {filteredFAQs?.length || 0} results
          </p>
          <Accordion type="single" collapsible className="space-y-2">
            {filteredFAQs?.map((page: any, index: number) => (
              <AccordionItem key={page.id} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline hover-elevate px-4 rounded-lg" data-testid={`accordion-faq-${page.slug}`}>
                  <div className="flex items-start gap-3 text-left">
                    <HelpCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{page.title}</div>
                      {page.category && (
                        <Badge variant="secondary" className="mt-1">
                          {page.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: page.content || '' }}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedFAQs || {}).map(([category, pages]: [string, any]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4" data-testid={`text-category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                {category}
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {pages.map((page: any, index: number) => (
                  <AccordionItem key={page.id} value={`${category}-${index}`}>
                    <AccordionTrigger className="hover:no-underline hover-elevate px-4 rounded-lg" data-testid={`accordion-faq-${page.slug}`}>
                      <div className="flex items-start gap-3 text-left">
                        <HelpCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <span className="font-medium">{page.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: page.content || '' }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
