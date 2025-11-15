import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight } from "lucide-react";
import DOMPurify from "dompurify";

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

export function HomeSectionRenderer({ section }: { section: HomeSection }) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const getLocalizedField = (enField: string | null, arField: string | null) => {
    if (isArabic && arField) return arField;
    return enField || arField || '';
  };

  const title = getLocalizedField(section.title, section.titleAr);
  const subtitle = getLocalizedField(section.subtitle, section.subtitleAr);
  const content = getLocalizedField(section.content, section.contentAr);
  const ctaText = getLocalizedField(section.ctaText, section.ctaTextAr);

  const sanitizeHTML = (html: string | null) => {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });
  };

  switch (section.sectionType) {
    case 'hero':
      return (
        <section 
          className="relative overflow-hidden bg-[#0A0E27] py-20 md:py-32 border-b-2 border-primary/30"
          data-testid={`section-cms-hero-${section.id}`}
        >
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {title && (
                <h1 
                  className="text-4xl md:text-6xl font-bold text-white tracking-tight"
                  data-testid={`text-cms-hero-title-${section.id}`}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p 
                  className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto"
                  data-testid={`text-cms-hero-subtitle-${section.id}`}
                >
                  {subtitle}
                </p>
              )}
              {content && (
                <div 
                  className="text-white/80 prose prose-invert max-w-none mx-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
                  data-testid={`text-cms-hero-content-${section.id}`}
                />
              )}
              {ctaText && section.ctaLink && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button 
                    size="lg" 
                    asChild 
                    className="bg-primary text-primary-foreground text-lg"
                    data-testid={`button-cms-hero-cta-${section.id}`}
                  >
                    <Link href={section.ctaLink}>
                      {ctaText}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      );

    case 'features':
      return (
        <section 
          className="py-20 bg-background"
          data-testid={`section-cms-features-${section.id}`}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              {title && (
                <h2 
                  className="text-3xl md:text-4xl font-bold mb-4"
                  data-testid={`text-cms-features-title-${section.id}`}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p 
                  className="text-muted-foreground text-lg max-w-2xl mx-auto"
                  data-testid={`text-cms-features-subtitle-${section.id}`}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {content && (
              <div 
                className="prose prose-slate dark:prose-invert max-w-4xl mx-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
                data-testid={`content-cms-features-${section.id}`}
              />
            )}
          </div>
        </section>
      );

    case 'stats':
      return (
        <section 
          className="py-20 bg-primary/5"
          data-testid={`section-cms-stats-${section.id}`}
        >
          <div className="container mx-auto px-4 md:px-6">
            {title && (
              <h2 
                className="text-3xl md:text-4xl font-bold text-center mb-12"
                data-testid={`text-cms-stats-title-${section.id}`}
              >
                {title}
              </h2>
            )}
            {content && (
              <div 
                className="prose prose-slate dark:prose-invert max-w-4xl mx-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
                data-testid={`content-cms-stats-${section.id}`}
              />
            )}
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section 
          className="py-20 bg-background"
          data-testid={`section-cms-testimonials-${section.id}`}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              {title && (
                <h2 
                  className="text-3xl md:text-4xl font-bold mb-4"
                  data-testid={`text-cms-testimonials-title-${section.id}`}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p 
                  className="text-muted-foreground text-lg max-w-2xl mx-auto"
                  data-testid={`text-cms-testimonials-subtitle-${section.id}`}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {content && (
              <div 
                className="prose prose-slate dark:prose-invert max-w-4xl mx-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
                data-testid={`content-cms-testimonials-${section.id}`}
              />
            )}
          </div>
        </section>
      );

    case 'cta':
      return (
        <section 
          className="py-20 bg-gradient-to-b from-[#0A0E27] to-[#0D1421] text-white"
          data-testid={`section-cms-cta-${section.id}`}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              {title && (
                <h2 
                  className="text-3xl md:text-4xl font-bold"
                  data-testid={`text-cms-cta-title-${section.id}`}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p 
                  className="text-xl text-white/60"
                  data-testid={`text-cms-cta-subtitle-${section.id}`}
                >
                  {subtitle}
                </p>
              )}
              {content && (
                <div 
                  className="text-white/80 prose prose-invert max-w-none mx-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
                  data-testid={`content-cms-cta-${section.id}`}
                />
              )}
              {ctaText && section.ctaLink && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button 
                    size="lg" 
                    asChild 
                    className="bg-primary text-primary-foreground text-lg"
                    data-testid={`button-cms-cta-${section.id}`}
                  >
                    <Link href={section.ctaLink}>
                      {ctaText}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
