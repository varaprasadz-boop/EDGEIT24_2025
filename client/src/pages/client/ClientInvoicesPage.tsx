import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { FileText, Eye, CreditCard, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Invoice } from "@shared/schema";

export default function ClientInvoicesPage() {
  const { user } = useAuthContext();
  const { t } = useTranslation();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices/client', user?.id],
    enabled: !!user?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'sent':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
      default:
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    }
  };

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toFixed(2)} ${t('clientInvoices.currency')}`;
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return false;
    return new Date(invoice.dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('clientInvoices.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('clientInvoices.subtitle')}
        </p>
      </div>

      {invoices && invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('clientInvoices.noInvoicesYet')}</h3>
            <p className="text-muted-foreground text-center">
              {t('clientInvoices.noInvoicesDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices?.map((invoice) => (
            <Card 
              key={invoice.id} 
              className={`hover-elevate ${isOverdue(invoice) ? 'border-red-500/50' : ''}`}
              data-testid={`card-invoice-${invoice.id}`}
            >
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-xl">
                        {invoice.invoiceNumber}
                      </CardTitle>
                      <Badge className={getStatusColor(invoice.status)} data-testid={`badge-status-${invoice.id}`}>
                        {t(`invoiceStatus.${invoice.status}`)}
                      </Badge>
                      {isOverdue(invoice) && (
                        <Badge variant="destructive" data-testid={`badge-overdue-${invoice.id}`}>
                          {t('clientInvoices.overdue')}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-2">
                      {t('clientInvoices.issued')}: {new Date(invoice.issueDate).toLocaleDateString('en-SA')}
                      {' • '}
                      {t('clientInvoices.due')}: {new Date(invoice.dueDate).toLocaleDateString('en-SA')}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" data-testid={`text-amount-${invoice.id}`}>
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.currency}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/client/invoices/${invoice.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-${invoice.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t('clientInvoices.viewDetails')}
                    </Button>
                  </Link>
                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <Link href={`/client/invoices/${invoice.id}`}>
                      <Button size="sm" data-testid={`button-pay-${invoice.id}`}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t('clientInvoices.payNow')}
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                    data-testid={`button-download-${invoice.id}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('clientInvoices.downloadPdf')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
