import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Plus, FileText, Eye, Send, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Invoice } from "@shared/schema";

export default function ConsultantInvoicesPage() {
  const { user } = useAuthContext();
  const { t } = useTranslation();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices/consultant', user?.id],
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
    return `${parseFloat(amount).toFixed(2)} ${t('consultantInvoices.currency')}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('consultantInvoices.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('consultantInvoices.subtitle')}
          </p>
        </div>
        <Link href="/consultant/invoices/create">
          <Button size="lg" data-testid="button-create-invoice">
            <Plus className="w-4 h-4 mr-2" />
            {t('consultantInvoices.createInvoice')}
          </Button>
        </Link>
      </div>

      {invoices && invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('consultantInvoices.noInvoicesYet')}</h3>
            <p className="text-muted-foreground text-center mb-6">
              {t('consultantInvoices.noInvoicesDesc')}
            </p>
            <Link href="/consultant/invoices/create">
              <Button data-testid="button-create-first-invoice">
                <Plus className="w-4 h-4 mr-2" />
                {t('consultantInvoices.createFirstInvoice')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices?.map((invoice) => (
            <Card key={invoice.id} className="hover-elevate" data-testid={`card-invoice-${invoice.id}`}>
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
                    </div>
                    <CardDescription className="mt-2">
                      {t('consultantInvoices.issued')}: {new Date(invoice.issueDate).toLocaleDateString('en-SA')}
                      {' • '}
                      {t('consultantInvoices.due')}: {new Date(invoice.dueDate).toLocaleDateString('en-SA')}
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
                  <Link href={`/consultant/invoices/${invoice.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-${invoice.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t('consultantInvoices.viewDetails')}
                    </Button>
                  </Link>
                  {invoice.status === 'draft' && (
                    <Link href={`/consultant/invoices/${invoice.id}`}>
                      <Button variant="outline" size="sm" data-testid={`button-send-${invoice.id}`}>
                        <Send className="w-4 h-4 mr-2" />
                        {t('consultantInvoices.sendEmail')}
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
                    {t('consultantInvoices.downloadPdf')}
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
