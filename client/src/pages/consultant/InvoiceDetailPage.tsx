import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send, Download, FileText } from "lucide-react";
import type { Invoice } from "@shared/schema";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['/api/invoices', id],
    enabled: !!id,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ clientEmail, message }: { clientEmail: string; message: string }) => {
      const response = await fetch(`/api/invoices/${id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipientEmail: clientEmail,
          message 
        }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to send email');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Invoice email has been sent to the client",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/consultant'] });
      setSendEmailDialogOpen(false);
      setEmailMessage("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
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
            <Link href="/consultant/invoices">
              <Button>Back to Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/consultant/invoices">
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
              </div>
              <CardDescription className="mt-2">
                Issued: {new Date(invoice.issueDate).toLocaleDateString('en-SA')}
                {' • '}
                Due: {new Date(invoice.dueDate).toLocaleDateString('en-SA')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant={invoice.status === 'draft' ? 'default' : 'outline'}
                    data-testid="button-send-email"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Invoice Email</DialogTitle>
                    <DialogDescription>
                      Send this invoice to your client via email
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message">Message (Optional)</Label>
                      <Textarea
                        id="message"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Add a personal message to the client"
                        rows={4}
                        data-testid="input-email-message"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          if (!invoice) return;
                          const client = await fetch(`/api/users/${invoice.clientId}`).then(r => r.json());
                          sendEmailMutation.mutate({ 
                            clientEmail: client.email, 
                            message: emailMessage 
                          });
                        }}
                        disabled={sendEmailMutation.isPending}
                        data-testid="button-confirm-send"
                      >
                        {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSendEmailDialogOpen(false)}
                        data-testid="button-cancel-send"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
              <h3 className="font-semibold mb-2">Amount</h3>
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
        </CardContent>
      </Card>
    </div>
  );
}
