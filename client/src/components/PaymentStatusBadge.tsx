import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface PaymentStatusBadgeProps {
  status: 'secured' | 'awaiting' | 'partial';
  className?: string;
}

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
  const statusConfig = {
    secured: {
      label: 'Payment Secured',
      icon: CheckCircle2,
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
    },
    awaiting: {
      label: 'Awaiting Payment',
      icon: Clock,
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
    },
    partial: {
      label: 'Partial Payment',
      icon: AlertCircle,
      variant: 'outline' as const,
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1 ${config.className} ${className}`}
      data-testid={`payment-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
