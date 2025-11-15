import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import * as LucideIcons from "lucide-react";
import { ArrowRight, Users, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  heroTitle: string | null;
  heroTitleAr: string | null;
  heroDescription: string | null;
  heroDescriptionAr: string | null;
  icon: string | null;
  level: number;
}

interface CategoryData {
  category: Category;
  children: Category[];
  breadcrumbs: Category[];
}

export default function CategoryLanding({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // Fetch category data
  const { data, isLoading, error } = useQuery<CategoryData>({
    queryKey: ["/api/categories/slug", slug],
    queryFn: async () => {
      const response = await fetch(`/api/categories/slug/${slug}`);
      if (!response.ok) {
        throw new Error("Category not found");
      }
      return response.json();
    },
  });

  // Get icon component from Lucide
  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 md:px-6 py-12">
            <Skeleton className="h-8 w-64 mb-8" />
            <Skeleton className="h-64 w-full mb-12" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The category you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { category, children, breadcrumbs } = data;
  const Icon = getIconComponent(category.icon);
  const isLeaf = category.level === 2 || children.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Breadcrumbs */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/" data-testid="breadcrumb-home">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <div key={crumb.id} className="flex items-center">
                      <BreadcrumbSeparator>
                        <ChevronRight className="h-4 w-4" />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage data-testid={`breadcrumb-${crumb.slug}`}>
                            {crumb.name}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link href={`/services/${crumb.slug}`} data-testid={`breadcrumb-${crumb.slug}`}>
                              {crumb.name}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#0A0E27] py-20 md:py-24 border-b-2 border-primary/30">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              {Icon && (
                <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="h-10 w-10 text-primary" />
                </div>
              )}
              <h1
                className="text-4xl md:text-5xl font-bold text-white tracking-tight"
                data-testid="text-hero-title"
              >
                {category.heroTitle || category.name}
              </h1>
              <p
                className="text-xl text-white/60 max-w-2xl mx-auto"
                data-testid="text-hero-description"
              >
                {category.heroDescription || category.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                {!isLeaf && (
                  <Button size="lg" variant="outline" asChild className="border-white/20 text-white">
                    <a href="#explore" data-testid="button-explore-categories">
                      Explore Categories <ArrowRight className="ml-2 h-5 w-5" />
                    </a>
                  </Button>
                )}
                <Button size="lg" asChild className="bg-primary text-primary-foreground">
                  <Link href={`/browse-consultants?category=${category.id}`} data-testid="button-find-consultants">
                    Find Consultants
                    <Users className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Child Categories Grid (if not leaf) */}
        {children.length > 0 && (
          <section id="explore" className="py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-subcategories-title">
                  Browse {category.name}
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Explore specialized services within {category.name}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {children.map((child) => {
                  const ChildIcon = getIconComponent(child.icon);
                  return (
                    <Card
                      key={child.id}
                      className="group hover-elevate"
                      data-testid={`card-subcategory-${child.slug}`}
                    >
                      <CardHeader>
                        {ChildIcon && (
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                            <ChildIcon className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <CardTitle className="text-xl" data-testid={`text-subcategory-${child.slug}-title`}>
                          {child.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <CardDescription data-testid={`text-subcategory-${child.slug}-desc`}>
                          {child.description}
                        </CardDescription>
                        <div className="flex flex-col gap-2 pt-2">
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-primary"
                            asChild
                            data-testid={`button-explore-${child.slug}`}
                          >
                            <Link href={`/services/${child.slug}`}>
                              Explore Services <ArrowRight className="ml-auto h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            asChild
                            data-testid={`button-find-consultant-${child.slug}`}
                          >
                            <Link href={`/browse-consultants?category=${child.id}`}>
                              Find Consultant <Users className="ml-auto h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Featured Consultants (if leaf) */}
        {isLeaf && (
          <section className="py-20 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-consultants-title">
                  Featured Consultants
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Top-rated professionals specialized in {category.name}
                </p>
              </div>

              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6">
                  Consultant listings coming soon. Meanwhile, you can browse all consultants.
                </p>
                <Button size="lg" asChild data-testid="button-browse-all-consultants">
                  <Link href={`/browse-consultants?category=${category.id}`}>
                    Browse All Consultants <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
