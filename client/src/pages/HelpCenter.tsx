import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  MessageSquare, 
  BookOpen, 
  FileText, 
  Video, 
  Shield, 
  HelpCircle,
  Search,
  Mail,
  Phone,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch popular help articles from CMS
  const { data: popularArticles = [] } = useQuery<any[]>({
    queryKey: ['/api/content/pages', { tags: 'help,faq' }],
  });

  const helpSections = [
    {
      title: "FAQ",
      description: "Find quick answers to frequently asked questions",
      icon: HelpCircle,
      path: "/help/faq",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    {
      title: "Knowledge Base",
      description: "Browse our comprehensive guides and tutorials",
      icon: BookOpen,
      path: "/help/knowledge-base",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      title: "Contact Support",
      description: "Submit a support ticket and get personalized help",
      icon: MessageSquare,
      path: "/help/contact",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950"
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step video guides",
      icon: Video,
      path: "/help/videos",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950"
    },
    {
      title: "Policies & Terms",
      description: "Read our platform policies and legal terms",
      icon: Shield,
      path: "/legal/terms",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950"
    },
    {
      title: "Documentation",
      description: "Technical documentation and API references",
      icon: FileText,
      path: "/help/docs",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950"
    },
  ];

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "support@edgeit24.com",
      detail: "Response within 24 hours"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "+966 XX XXX XXXX",
      detail: "Sun-Thu, 9AM-6PM"
    },
    {
      icon: Clock,
      title: "Average Response Time",
      description: "2-4 hours",
      detail: "For urgent tickets"
    }
  ];

  return (
    <UserLayout>
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-help-center-title">
              How can we help you?
            </h1>
            <p className="text-lg text-muted-foreground mb-8" data-testid="text-help-center-subtitle">
              Search our knowledge base or browse categories below to find answers
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for help articles, guides, or topics..."
                className="pl-12 pr-4 py-6 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-help-search"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Help Categories Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6" data-testid="text-browse-categories">
            Browse by Category
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpSections.map((section) => (
              <Link key={section.path} href={section.path}>
                <Card className="h-full hover-elevate active-elevate-2 transition-all cursor-pointer" data-testid={`card-help-section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center mb-3`}>
                      <section.icon className={`h-6 w-6 ${section.color}`} />
                    </div>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Articles Section */}
        {popularArticles && popularArticles.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6" data-testid="text-popular-articles">
              Popular Help Articles
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {popularArticles.slice(0, 6).map((article: any) => (
                <Link key={article.id} href={`/help/article/${article.slug}`}>
                  <Card className="hover-elevate active-elevate-2 transition-all cursor-pointer" data-testid={`card-article-${article.slug}`}>
                    <CardHeader>
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {article.metaDescription || article.excerpt}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Contact Methods */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6" data-testid="text-contact-methods">
            Still need help?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => (
              <Card key={index} data-testid={`card-contact-method-${index}`}>
                <CardHeader>
                  <method.icon className="h-8 w-8 text-primary mb-3" />
                  <CardTitle className="text-lg">{method.title}</CardTitle>
                  <CardDescription className="space-y-1">
                    <div className="font-medium text-foreground">{method.description}</div>
                    <div className="text-sm">{method.detail}</div>
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-3" data-testid="text-cta-title">
              Can't find what you're looking for?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Our support team is here to help. Submit a support ticket and we'll get back to you as soon as possible.
            </p>
            <Link href="/help/contact">
              <Button size="lg" data-testid="button-contact-support">
                <MessageSquare className="mr-2 h-5 w-5" />
                Contact Support
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    </UserLayout>
  );
}
