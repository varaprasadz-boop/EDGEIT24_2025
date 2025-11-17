import { Badge } from "@/components/ui/badge";
import { CheckCircle, Award, Star } from "lucide-react";

interface VerificationBadgeProps {
  badge: 'verified' | 'premium' | 'expert' | null;
  size?: 'sm' | 'default';
}

export function VerificationBadge({ badge, size = 'default' }: VerificationBadgeProps) {
  if (!badge) return null;

  const badgeConfig = {
    verified: {
      label: 'Verified',
      icon: CheckCircle,
      className: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
    },
    premium: {
      label: 'Premium',
      icon: Award,
      className: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20',
    },
    expert: {
      label: 'Expert',
      icon: Star,
      className: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20',
    },
  };

  const config = badgeConfig[badge];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <Badge 
      className={config.className} 
      data-testid={`badge-verification-${badge}`}
    >
      <Icon className={`${iconSize} mr-1`} />
      {config.label}
    </Badge>
  );
}
