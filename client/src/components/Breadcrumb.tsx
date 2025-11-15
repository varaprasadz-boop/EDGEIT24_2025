import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

export function Breadcrumb() {
  const [location] = useLocation();
  const { t } = useTranslation();

  const pathSegments = location.split('/').filter(Boolean);
  
  if (pathSegments[0] !== 'admin' || pathSegments.length < 2) {
    return null;
  }

  const breadcrumbMap: Record<string, string> = {
    'dashboard': t('breadcrumb.dashboard'),
    'users': t('breadcrumb.users'),
    'vendors': t('breadcrumb.vendors'),
    'categories': t('breadcrumb.categories'),
    'vendor-requests': t('breadcrumb.vendorRequests'),
    'requirements': t('breadcrumb.requirements'),
    'bids': t('breadcrumb.bids'),
    'messages': t('breadcrumb.messages'),
    'reviews': t('breadcrumb.reviews'),
    'notifications': t('breadcrumb.notifications'),
    'contracts': t('breadcrumb.contracts'),
    'payments': t('breadcrumb.payments'),
    'withdrawals': t('breadcrumb.withdrawals'),
    'disputes': t('breadcrumb.disputes'),
    'analytics': t('breadcrumb.analytics'),
    'reports': t('breadcrumb.reports'),
    'settings': t('breadcrumb.settings'),
    'subscription-plans': t('breadcrumb.subscriptionPlans'),
    'email-templates': t('breadcrumb.emailTemplates'),
  };

  const adminSegments = pathSegments.slice(1);

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground" data-testid="breadcrumb-nav">
      <Link href="/admin/dashboard" className="flex items-center hover-elevate rounded px-2 py-1 transition-colors" data-testid="breadcrumb-home">
        <Home className="h-4 w-4" />
      </Link>
      
      {adminSegments.map((segment, index) => {
        const isLast = index === adminSegments.length - 1;
        const href = `/admin/${adminSegments.slice(0, index + 1).join('/')}`;
        const label = breadcrumbMap[segment] || segment;

        return (
          <div key={segment} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground" data-testid={`breadcrumb-current-${segment}`}>
                {label}
              </span>
            ) : (
              <Link 
                href={href} 
                className="hover-elevate rounded px-2 py-1 transition-colors"
                data-testid={`breadcrumb-link-${segment}`}
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
