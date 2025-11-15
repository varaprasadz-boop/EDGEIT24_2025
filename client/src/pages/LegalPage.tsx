import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { Link } from "wouter";

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  content: string;
  contentAr: string | null;
  pageType: string;
  metaTitle: string | null;
  metaTitleAr: string | null;
  metaDescription: string | null;
  metaDescriptionAr: string | null;
  publishedAt: string | null;
}

export default function LegalPage() {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  
  const { data: page, isLoading, error } = useQuery<ContentPage>({
    queryKey: ['/api/content-pages', slug],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" data-testid="legal-page-loading">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="legal-page-error">
        <Card className="p-8 max-w-md text-center" data-testid="card-error">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2" data-testid="text-error-title">Page Not Found</h1>
          <p className="text-muted-foreground mb-4" data-testid="text-error-message">
            The page you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/">
            <Button data-testid="button-back-to-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isArabic = i18n.language === 'ar';
  const title = isArabic && page.titleAr ? page.titleAr : page.title;
  const content = isArabic && page.contentAr ? page.contentAr : page.content;
  const metaTitle = isArabic && page.metaTitleAr ? page.metaTitleAr : page.metaTitle || title;
  const metaDescription = isArabic && page.metaDescriptionAr ? page.metaDescriptionAr : page.metaDescription;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        {metaDescription && <meta name="description" content={metaDescription} />}
        <meta property="og:title" content={metaTitle} />
        {metaDescription && <meta property="og:description" content={metaDescription} />}
        <meta property="og:type" content="article" />
      </Helmet>

      <div className="min-h-screen bg-background" data-testid="legal-page-container">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          <Card className="p-8" data-testid="legal-page-content">
            <article 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            
            {page.publishedAt && (
              <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">
                Last updated: {new Date(page.publishedAt).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
