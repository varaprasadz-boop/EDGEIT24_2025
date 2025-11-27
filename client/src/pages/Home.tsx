import { useEffect } from "react";
import { Link, useLocation, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomeSectionRenderer } from "@/components/HomeSectionRenderer";
import { useAuthContext } from "@/contexts/AuthContext";
import type { SubscriptionPlan } from "@shared/schema";
import * as LucideIcons from "lucide-react";
import {
  Users,
  Code,
  Megaphone,
  HardDrive,
  CheckCircle2,
  Upload,
  MessageSquare,
  Star,
  ArrowRight,
  TrendingUp,
  Shield,
  Clock,
  Zap
} from "lucide-react";

interface HomeSection {
  id: string;
  sectionType: 'hero' | 'features' | 'testimonials' | 'stats' | 'cta';
  title: string | null;
  titleAr: string | null;
  subtitle: string | null;
  subtitleAr: string | null;
  content: string | null;
  contentAr: string | null;
  imageUrl: string | null;
  ctaText: string | null;
  ctaTextAr: string | null;
  ctaLink: string | null;
  displayOrder: number;
  active: boolean;
  settings: any;
}

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  icon: string | null;
}

// Helper to create stable test ID slug from plan name
function createPlanSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// Helper to render plan badge
function renderPlanBadge(plan: SubscriptionPlan, t: any) {
  if (plan.price === "0") {
    return <Badge variant="outline" data-testid={`badge-${plan.audience}-${createPlanSlug(plan.name)}`}>{t('home.engagementModels.free')}</Badge>;
  }
  if (plan.popular) {
    return <Badge className="bg-primary text-primary-foreground" data-testid={`badge-${plan.audience}-${createPlanSlug(plan.name)}`}>{t('home.engagementModels.popular')}</Badge>;
  }
  if (plan.featured) {
    return <Badge variant="outline" data-testid={`badge-${plan.audience}-${createPlanSlug(plan.name)}`}>{t('home.engagementModels.enterprise')}</Badge>;
  }
  return null;
}

// Render a single subscription plan card
function PlanCard({ plan, t }: { plan: SubscriptionPlan; t: any }) {
  const slug = createPlanSlug(plan.name);
  const features = (plan.features as any)?.list || [];
  const isPopular = plan.popular;
  const priceNum = parseFloat(plan.price);
  const formattedPrice = priceNum === 0 ? "0" : priceNum.toLocaleString('en-US');

  return (
    <Card 
      className={isPopular ? "hover-elevate border-primary shadow-lg shadow-primary/10" : "hover-elevate"} 
      data-testid={`card-${plan.audience}-${slug}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-2xl" data-testid={`text-${plan.audience}-${slug}-name`}>
            {plan.name}
          </CardTitle>
          {renderPlanBadge(plan, t)}
        </div>
        <CardDescription data-testid={`text-${plan.audience}-${slug}-desc`}>
          {plan.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold" data-testid={`text-${plan.audience}-${slug}-price`}>
          ﷼ {formattedPrice}
          <span className="text-base font-normal text-muted-foreground">{t('home.engagementModels.perMonth')}</span>
        </div>
        <ul className="space-y-3">
          {features.map((feature: any, idx: number) => (
            <li 
              key={idx} 
              className="flex items-start gap-2" 
              data-testid={`text-${plan.audience}-${slug}-feature-${idx + 1}`}
            >
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature.en}</span>
            </li>
          ))}
        </ul>
        <Button 
          className={isPopular ? "w-full bg-primary text-primary-foreground" : "w-full"} 
          variant={isPopular ? "default" : "outline"} 
          data-testid={`button-${plan.audience}-${slug}`}
        >
          {t('home.engagementModels.choose', { name: plan.name })}
        </Button>
      </CardContent>
    </Card>
  );
}

// Skeleton loader for plan cards
function PlanCardSkeleton() {
  return (
    <Card className="hover-elevate">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const [, setLocation] = useLocation();

  // Redirect admin users to admin portal
  useEffect(() => {
    if (user?.role === 'admin') {
      setLocation('/admin/dashboard');
    }
  }, [user, setLocation]);

  // Fetch all subscription plans (single query, filter client-side)
  const { data: allPlans = [], isLoading: plansLoading, error: plansError } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
  });

  // Fetch root categories for homepage
  const { data: rootCategories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories/root'],
  });

  // Fetch CMS home sections
  const { data: cmsSectionsData } = useQuery({
    queryKey: ['/api/content/home-sections'],
  });
  const cmsSections = (cmsSectionsData as any)?.sections || [];
  const activeCMSSections = cmsSections.filter((s: HomeSection) => s.active).sort((a: HomeSection, b: HomeSection) => a.displayOrder - b.displayOrder);

  // Filter plans by audience
  const clientPlans = allPlans.filter(plan => plan.audience === 'client');
  const consultantPlans = allPlans.filter(plan => plan.audience === 'consultant');

  // Get icon component from Lucide
  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Code;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || Code;
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#0A0E27] py-20 md:py-32 border-b-2 border-primary/30">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" data-testid="badge-hero">
                {t('home.hero.badge')}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight" data-testid="text-hero-title">
                {t('home.hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
                {t('home.hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" asChild className="bg-primary text-primary-foreground text-lg" data-testid="button-hero-client">
                  <Link href="/register">
                    {t('home.hero.clientButton')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white/20 text-white text-lg" data-testid="button-hero-vendor">
                  <Link href="/register">
                    {t('home.hero.vendorButton')}
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 md:gap-12 pt-8 text-white/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm" data-testid="text-trust-companies">{t('home.hero.trustedCompanies')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm" data-testid="text-trust-experts">{t('home.hero.itExperts')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm" data-testid="text-trust-success">{t('home.hero.successRate')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-how-title">{t('home.howItWorks.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-how-subtitle">
                {t('home.howItWorks.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="text-center hover-elevate" data-testid="card-step-1">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle data-testid="text-step-1-title">{t('home.howItWorks.step1.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base" data-testid="text-step-1-desc">
                    {t('home.howItWorks.step1.description')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover-elevate" data-testid="card-step-2">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle data-testid="text-step-2-title">{t('home.howItWorks.step2.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base" data-testid="text-step-2-desc">
                    {t('home.howItWorks.step2.description')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover-elevate" data-testid="card-step-3">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle data-testid="text-step-3-title">{t('home.howItWorks.step3.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base" data-testid="text-step-3-desc">
                    {t('home.howItWorks.step3.description')}
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-engagement-title">{t('home.engagementModels.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8" data-testid="text-engagement-subtitle">
                {t('home.engagementModels.subtitle')}
              </p>
            </div>
            
            <Tabs defaultValue="clients" className="max-w-6xl mx-auto">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12" data-testid="tabs-engagement">
                <TabsTrigger value="clients" data-testid="tab-clients">{t('home.engagementModels.forClients')}</TabsTrigger>
                <TabsTrigger value="consultants" data-testid="tab-consultants">{t('home.engagementModels.forConsultants')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="clients" data-testid="content-clients">
                {plansLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <PlanCardSkeleton />
                    <PlanCardSkeleton />
                    <PlanCardSkeleton />
                  </div>
                ) : plansError ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">{t('home.engagementModels.failedToLoad')}</p>
                    <Button onClick={() => window.location.reload()}>{t('home.engagementModels.retry')}</Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {clientPlans.map(plan => (
                      <PlanCard key={plan.id} plan={plan} t={t} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="consultants" data-testid="content-consultants">
                {plansLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <PlanCardSkeleton />
                    <PlanCardSkeleton />
                    <PlanCardSkeleton />
                  </div>
                ) : plansError ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">{t('home.engagementModels.failedToLoad')}</p>
                    <Button onClick={() => window.location.reload()}>{t('home.engagementModels.retry')}</Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {consultantPlans.map(plan => (
                      <PlanCard key={plan.id} plan={plan} t={t} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-services-title">{t('home.services.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-services-subtitle">
                {t('home.services.subtitle')}
              </p>
            </div>
            
            {categoriesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="hover-elevate">
                    <CardHeader>
                      <Skeleton className="w-12 h-12 rounded-lg mb-4" />
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full mb-4" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {rootCategories.map((category) => {
                  const Icon = getIconComponent(category.icon);
                  return (
                    <Card key={category.id} className="group hover-elevate" data-testid={`card-service-${category.slug}`}>
                      <CardHeader>
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl" data-testid={`text-service-${category.slug}-title`}>
                          {category.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <CardDescription data-testid={`text-service-${category.slug}-desc`}>
                          {category.description}
                        </CardDescription>
                        <div className="flex flex-col gap-2 pt-2">
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-primary"
                            asChild
                            data-testid={`button-explore-${category.slug}`}
                          >
                            <Link href={`/services/${category.slug}`}>
                              {t('home.services.exploreServices')} <ArrowRight className="ml-auto h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            asChild
                            data-testid={`button-find-consultant-${category.slug}`}
                          >
                            <Link href={`/browse-consultants?category=${category.id}`}>
                              {t('home.services.findConsultant')} <Users className="ml-auto h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-vendors-title">{t('home.vendors.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-vendors-subtitle">
                {t('home.vendors.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                { name: "Sarah Johnson", title: "Full Stack Developer", rating: 5.0, skills: ["React", "Node.js", "AWS"], projects: 45 },
                { name: "Michael Chen", title: "Cloud Architect", rating: 4.9, skills: ["Azure", "DevOps", "Kubernetes"], projects: 38 },
                { name: "Emily Davis", title: "UI/UX Designer", rating: 5.0, skills: ["Figma", "Design Systems", "Mobile"], projects: 52 }
              ].map((vendor, idx) => (
                <Card key={idx} className="hover-elevate" data-testid={`card-vendor-${idx}`}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${vendor.name}`} />
                        <AvatarFallback>{vendor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`text-vendor-name-${idx}`}>{vendor.name}</CardTitle>
                        <p className="text-sm text-muted-foreground" data-testid={`text-vendor-title-${idx}`}>{vendor.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span className="text-sm font-medium" data-testid={`text-rating-${idx}`}>{vendor.rating}</span>
                          <span className="text-sm text-muted-foreground" data-testid={`text-projects-${idx}`}>({t('home.vendors.projects', { count: vendor.projects })})</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {vendor.skills.map((skill, skillIdx) => (
                        <Badge key={skillIdx} variant="secondary" className="text-xs" data-testid={`badge-skill-${idx}-${skillIdx}`}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full mt-4" variant="outline" asChild data-testid={`button-view-profile-${idx}`}>
                      <Link href="/browse-consultants">
                        {t('home.vendors.viewProfile')}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button size="lg" variant="outline" asChild data-testid="button-view-all-vendors">
                <Link href="/browse-consultants">
                  {t('home.vendors.viewAll')} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
              <div data-testid="stat-projects">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <div className="text-4xl font-bold text-primary" data-testid="text-stat-projects-value">5000+</div>
                </div>
                <p className="text-muted-foreground" data-testid="text-stat-projects-label">{t('home.stats.projectsCompleted')}</p>
              </div>
              <div data-testid="stat-vendors">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-6 w-6 text-primary" />
                  <div className="text-4xl font-bold text-primary" data-testid="text-stat-vendors-value">1200+</div>
                </div>
                <p className="text-muted-foreground" data-testid="text-stat-vendors-label">{t('home.stats.activeVendors')}</p>
              </div>
              <div data-testid="stat-success">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                  <div className="text-4xl font-bold text-primary" data-testid="text-stat-success-value">98%</div>
                </div>
                <p className="text-muted-foreground" data-testid="text-stat-success-label">{t('home.stats.successRate')}</p>
              </div>
              <div data-testid="stat-transactions">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-6 w-6 text-primary" />
                  <div className="text-4xl font-bold text-primary" data-testid="text-stat-transactions-value">$2M+</div>
                </div>
                <p className="text-muted-foreground" data-testid="text-stat-transactions-label">{t('home.stats.totalTransactions')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-testimonials-title">{t('home.testimonials.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-testimonials-subtitle">
                {t('home.testimonials.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  quote: "EDGEIT24 helped us find the perfect development team. The bidding process was transparent and we got excellent value.",
                  author: "John Smith",
                  role: "CTO, TechCorp",
                  rating: 5
                },
                {
                  quote: "As a vendor, this platform has been instrumental in growing my business. The quality of clients is exceptional.",
                  author: "Maria Garcia",
                  role: "Founder, DevSolutions",
                  rating: 5
                },
                {
                  quote: "Quick, efficient, and reliable. We've completed over 20 projects through EDGEIT24 with outstanding results.",
                  author: "David Lee",
                  role: "Project Manager, InnovateLabs",
                  rating: 5
                }
              ].map((testimonial, idx) => (
                <Card key={idx} className="hover-elevate" data-testid={`card-testimonial-${idx}`}>
                  <CardHeader>
                    <div className="flex gap-1 mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <CardDescription className="text-base italic" data-testid={`text-testimonial-quote-${idx}`}>
                      "{testimonial.quote}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${testimonial.author}`} />
                        <AvatarFallback>{testimonial.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm" data-testid={`text-testimonial-author-${idx}`}>{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-testimonial-role-${idx}`}>{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-b from-[#0A0E27] to-[#0D1421] text-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-cta-title">
                {t('home.cta.title')}
              </h2>
              <p className="text-xl text-white/60" data-testid="text-cta-subtitle">
                {t('home.cta.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" asChild className="bg-primary text-primary-foreground text-lg" data-testid="button-cta-post">
                  <Link href="/post-requirement">
                    {t('home.cta.postButton')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white/20 text-white text-lg" data-testid="button-cta-browse">
                  <Link href="/browse">
                    {t('home.cta.browseButton')}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {activeCMSSections.length > 0 && activeCMSSections.map((section: HomeSection) => (
          <HomeSectionRenderer key={section.id} section={section} />
        ))}
      </main>

      <Footer />
    </div>
  );
}
