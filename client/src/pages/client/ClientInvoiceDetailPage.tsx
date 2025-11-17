import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, CreditCard, Download, FileText } from "lucide-react";
import type { Invoice } from "@shared/schema";

export default function ClientInvoiceDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['/api/invoices', id],
    enabled: !!id,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to process payment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment successful",
        description: "Your payment has been processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/client'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error.message,
      });
    },
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

  const formatCurrency = (amount: string | number) => {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${numValue.toFixed(2)} SAR`;
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return false;
    return new Date(invoice.dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Invoice not found</h3>
            <Link href="/client/invoices">
              <Button>Back to Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canPay = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/client/invoices">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-2xl">{invoice.invoiceNumber}</CardTitle>
                <Badge className={getStatusColor(invoice.status)} data-testid="badge-status">
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
                {isOverdue(invoice) && (
                  <Badge variant="destructive" data-testid="badge-overdue">
                    Overdue
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-2">
                Issued: {new Date(invoice.issueDate).toLocaleDateString('en-SA')}
                {' • '}
                Due: {new Date(invoice.dueDate).toLocaleDateString('en-SA')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {canPay && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button data-testid="button-pay">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Invoice
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to pay this invoice for{' '}
                        <span className="font-bold">{formatCurrency(invoice.totalAmount)}</span>?
                        The amount will be deducted from your wallet balance.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-payment">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => payMutation.mutate()}
                        disabled={payMutation.isPending}
                        data-testid="button-confirm-payment"
                      >
                        {payMutation.isPending ? "Processing..." : "Confirm Payment"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                variant="outline"
                onClick={() => window.open(`/api/invoices/${id}/pdf`, '_blank')}
                data-testid="button-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Amount Due</h3>
              <div className="text-3xl font-bold" data-testid="text-total">
                {formatCurrency(invoice.totalAmount)}
              </div>
              <div className="text-sm text-muted-foreground">{invoice.currency}</div>
            </div>
            {invoice.paidAt && (
              <div>
                <h3 className="font-semibold mb-2">Paid On</h3>
                <div className="text-lg" data-testid="text-paid-date">
                  {new Date(invoice.paidAt).toLocaleDateString('en-SA')}
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Invoice Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-right p-3">Unit Price</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items as any[]).map((item, index) => (
                    <tr key={index} className="border-t" data-testid={`row-item-${index}`}>
                      <td className="p-3">{item.description}</td>
                      <td className="text-right p-3">{item.quantity}</td>
                      <td className="text-right p-3">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right p-3 font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span data-testid="text-subtotal">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (15%):</span>
                <span data-testid="text-vat">{formatCurrency(invoice.vatAmount)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span data-testid="text-grand-total">{formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-notes">
                {invoice.notes}
              </p>
            </div>
          )}

          {canPay && (
            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Payment will be processed from your wallet balance. Make sure you have sufficient funds before proceeding.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
