import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const statusConfig = {
  not_started: {
    label: "Not Started",
    variant: "secondary" as const,
    tooltip: "Project has been created but work has not begun"
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    tooltip: "Project is actively being worked on"
  },
  awaiting_review: {
    label: "Awaiting Review",
    variant: "outline" as const,
    tooltip: "Work is completed and waiting for client review"
  },
  revision_requested: {
    label: "Revision Requested",
    variant: "destructive" as const,
    tooltip: "Client has requested changes to deliverables"
  },
  completed: {
    label: "Completed",
    variant: "default" as const,
    tooltip: "Project has been successfully completed"
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline" as const,
    tooltip: "Project has been cancelled"
  },
  on_hold: {
    label: "On Hold",
    variant: "secondary" as const,
    tooltip: "Project is temporarily paused"
  },
  delayed: {
    label: "Delayed",
    variant: "destructive" as const,
    tooltip: "Project is behind schedule"
  }
};

interface ProjectStatusBadgeProps {
  status: keyof typeof statusConfig;
  showTooltip?: boolean;
}

export function ProjectStatusBadge({ status, showTooltip = true }: ProjectStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.not_started;
  
  const badge = (
    <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
