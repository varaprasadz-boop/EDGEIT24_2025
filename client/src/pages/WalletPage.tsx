import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Wallet, Plus, Minus, ArrowUpDown, Download, Upload } from "lucide-react";

interface WalletBalance {
  userId: string;
  balance: string;
  currency: string;
  updatedAt: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: string;
  amount: string;
  currency: string;
  description: string;
  reference: string | null;
  createdAt: string;
}

export default function WalletPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: balance, isLoading: balanceLoading } = useQuery<WalletBalance>({
    queryKey: ['/api/wallet/balance', user?.id],
    enabled: !!user?.id,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<{
    transactions: WalletTransaction[];
    total: number;
  }>({
    queryKey: ['/api/wallet/transactions', user?.id, transactionFilter, currentPage, pageSize],
    enabled: !!user?.id,
  });

  const depositMutation = useMutation({
    mutationFn: async (amount: string) => {
      const response = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount).toFixed(2) }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to deposit');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit successful",
        description: "Funds have been added to your wallet",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      setDepositDialogOpen(false);
      setDepositAmount("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Deposit failed",
        description: error.message,
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: string) => {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount).toFixed(2) }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to withdraw');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal successful",
        description: "Funds have been withdrawn from your wallet",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Withdrawal failed",
        description: error.message,
      });
    },
  });

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toFixed(2)} SAR`;
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'escrow_release':
      case 'refund':
        return 'text-green-600 dark:text-green-400';
      case 'withdrawal':
      case 'escrow_hold':
      case 'invoice_payment':
      case 'platform_fee':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'escrow_release':
      case 'refund':
        return <Download className="w-4 h-4" />;
      case 'withdrawal':
      case 'escrow_hold':
      case 'invoice_payment':
      case 'platform_fee':
        return <Upload className="w-4 h-4" />;
      default:
        return <ArrowUpDown className="w-4 h-4" />;
    }
  };

  const formatTransactionType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const totalPages = transactionsData ? Math.ceil(transactionsData.total / pageSize) : 0;

  if (balanceLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-48 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Wallet</h1>
        <p className="text-muted-foreground mt-1">
          Manage your funds and view transaction history
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Balance
          </CardTitle>
          <CardDescription>Your current available balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
            <div>
              <div className="text-4xl font-bold mb-2" data-testid="text-balance">
                {balance ? formatCurrency(balance.balance) : '0.00 SAR'}
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {balance ? new Date(balance.updatedAt).toLocaleString('en-SA') : 'N/A'}
              </div>
            </div>
            <div className="flex gap-3">
              <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-deposit">
                    <Plus className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Deposit Funds</DialogTitle>
                    <DialogDescription>
                      Add funds to your wallet
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deposit-amount">Amount (SAR)</Label>
                      <Input
                        id="deposit-amount"
                        type="number"
                        step="0.01"
                        min="1"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Enter amount"
                        data-testid="input-deposit-amount"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => depositMutation.mutate(depositAmount)}
                        disabled={!depositAmount || depositMutation.isPending || parseFloat(depositAmount) <= 0}
                        data-testid="button-confirm-deposit"
                      >
                        {depositMutation.isPending ? "Processing..." : "Deposit"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setDepositDialogOpen(false)}
                        data-testid="button-cancel-deposit"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-withdraw">
                    <Minus className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Withdraw Funds</DialogTitle>
                    <DialogDescription>
                      Withdraw funds from your wallet
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="withdraw-amount">Amount (SAR)</Label>
                      <Input
                        id="withdraw-amount"
                        type="number"
                        step="0.01"
                        min="1"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Enter amount"
                        data-testid="input-withdraw-amount"
                      />
                      <p className="text-sm text-muted-foreground">
                        Available: {balance ? formatCurrency(balance.balance) : '0.00 SAR'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => withdrawMutation.mutate(withdrawAmount)}
                        disabled={
                          !withdrawAmount || 
                          withdrawMutation.isPending || 
                          parseFloat(withdrawAmount) <= 0 ||
                          parseFloat(withdrawAmount) > parseFloat(balance?.balance || '0')
                        }
                        data-testid="button-confirm-withdraw"
                      >
                        {withdrawMutation.isPending ? "Processing..." : "Withdraw"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setWithdrawDialogOpen(false)}
                        data-testid="button-cancel-withdraw"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View all your wallet transactions</CardDescription>
            </div>
            <Select value={transactionFilter} onValueChange={setTransactionFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-filter">
                <SelectValue placeholder="Filter transactions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="invoice_payment">Invoice Payments</SelectItem>
                <SelectItem value="escrow_hold">Escrow Holds</SelectItem>
                <SelectItem value="escrow_release">Escrow Releases</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="platform_fee">Platform Fees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactionsData && transactionsData.transactions.length > 0 ? (
            <>
              <div className="space-y-2">
                {transactionsData.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={getTransactionTypeColor(transaction.type)}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="font-medium">{formatTransactionType(transaction.type)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString('en-SA')}
                        </div>
                        {transaction.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {transaction.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`text-lg font-semibold ${getTransactionTypeColor(transaction.type)}`}>
                      {['deposit', 'escrow_release', 'refund'].includes(transaction.type) ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-previous-page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <ArrowUpDown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
