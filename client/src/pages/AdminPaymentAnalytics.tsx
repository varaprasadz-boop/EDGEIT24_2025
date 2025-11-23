import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Wallet, FileText, Users, ArrowUpDown } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface PaymentAnalytics {
  totalRevenue: number;
  totalInvoices: number;
  totalTransactions: number;
  totalUsers: number;
  revenueByMonth: { month: string; revenue: number }[];
  invoicesByStatus: { status: string; count: number }[];
  topUsers: { userId: string; totalSpent: number }[];
  transactionTypes: { type: string; count: number; total: number }[];
  walletStats: { totalBalance: number; totalDeposits: number; totalWithdrawals: number };
  escrowStats: { totalHeld: number; totalReleased: number; totalRefunded: number };
}

export default function AdminPaymentAnalytics() {
  const { data: analytics, isLoading } = useQuery<PaymentAnalytics>({
    queryKey: ['/api/admin/payments/analytics'],
  });

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} SAR`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-4">
        <AdminPageHeader
          title="Payment Analytics"
          subtitle="Platform-wide payment and financial metrics"
          testId="payment-analytics"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4 mb-4">
        <AdminPageHeader
          title="Payment Analytics"
          subtitle="Platform-wide payment and financial metrics"
          testId="payment-analytics"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time revenue</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-invoices">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">Invoices created</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-transactions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1">All transactions</p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">With transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card data-testid="card-wallet-stats">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <CardTitle>Wallet Statistics</CardTitle>
            </div>
            <CardDescription>Platform wallet metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Balance:</span>
              <span className="font-semibold">{formatCurrency(analytics.walletStats.totalBalance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Deposits:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(analytics.walletStats.totalDeposits)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Withdrawals:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(analytics.walletStats.totalWithdrawals)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-escrow-stats">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>Escrow Statistics</CardTitle>
            </div>
            <CardDescription>Escrow transaction metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Currently Held:</span>
              <span className="font-semibold">{formatCurrency(analytics.escrowStats.totalHeld)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Released:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(analytics.escrowStats.totalReleased)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Refunded:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(analytics.escrowStats.totalRefunded)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card data-testid="card-invoice-status">
          <CardHeader>
            <CardTitle>Invoices by Status</CardTitle>
            <CardDescription>Distribution of invoice statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.invoicesByStatus.map((item) => (
                <div key={item.status} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{item.status}:</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-transaction-types">
          <CardHeader>
            <CardTitle>Transaction Types</CardTitle>
            <CardDescription>Breakdown by transaction type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.transactionTypes.map((item) => (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm capitalize">
                      {item.type.split('_').join(' ')}:
                    </span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    Total: {formatCurrency(item.total)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
