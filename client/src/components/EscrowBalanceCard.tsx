import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

interface EscrowBalanceCardProps {
  projectBudget: string;
  escrowBalance: string;
  releasedAmount: string;
  className?: string;
  currency?: string;
}

export function EscrowBalanceCard({ 
  projectBudget, 
  escrowBalance, 
  releasedAmount,
  currency = 'SAR',
  className = '' 
}: EscrowBalanceCardProps) {
  const budget = parseFloat(projectBudget);
  const available = parseFloat(escrowBalance);
  const released = parseFloat(releasedAmount);
  
  const remainingBudget = budget - released;
  const progressPercentage = budget > 0 ? (released / budget) * 100 : 0;
  const escrowFunded = available >= budget;

  return (
    <Card className={className} data-testid="escrow-balance-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Project Payment Status
        </CardTitle>
        <CardDescription>
          Escrow balance and payment tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold" data-testid="total-budget">
              {currency} {budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">In Escrow</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="escrow-balance">
              {currency} {available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Progress</span>
            <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Released</p>
              <p className="text-sm font-semibold" data-testid="released-amount">
                {currency} {released.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-sm font-semibold" data-testid="remaining-amount">
                {currency} {remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {!escrowFunded && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Action Required:</strong> {currency} {(budget - available).toFixed(2)} needs to be deposited to escrow before work can begin.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
