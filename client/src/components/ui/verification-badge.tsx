import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  type: "email" | "phone" | "identity" | "business" | "bank";
  verified: boolean;
  showLabel?: boolean;
}

const badgeLabels = {
  email: "Email",
  phone: "Phone",
  identity: "Identity",
  business: "Business",
  bank: "Bank Account"
};

const badgeDescriptions = {
  email: "Email address has been verified",
  phone: "Phone number has been verified",
  identity: "Identity documents have been verified",
  business: "Business registration has been verified",
  bank: "Bank account details have been verified"
};

export function VerificationBadge({ type, verified, showLabel = true }: VerificationBadgeProps) {
  const label = badgeLabels[type];
  const description = verified 
    ? badgeDescriptions[type]
    : `${badgeLabels[type]} not yet verified`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={verified ? "default" : "secondary"}
            className="gap-1"
            data-testid={`badge-${type}-${verified ? 'verified' : 'unverified'}`}
          >
            {verified ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {showLabel && label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
