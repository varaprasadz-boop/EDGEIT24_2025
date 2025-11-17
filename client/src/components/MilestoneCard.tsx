import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, DollarSign, MessageSquare, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Milestone {
  title: string;
  description?: string;
  dueDate?: Date | string;
  amount?: number;
  status: string;
  progress?: number;
}

interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  currency?: string;
  commentsCount?: number;
  onUploadDeliverable?: () => void;
  onViewComments?: () => void;
  showActions?: boolean;
}

const statusColors: Record<string, string> = {
  pending: "secondary",
  in_progress: "default",
  completed: "default",
  overdue: "destructive",
};

export function MilestoneCard({ 
  milestone, 
  index, 
  currency = "SAR",
  commentsCount = 0,
  onUploadDeliverable,
  onViewComments,
  showActions = true
}: MilestoneCardProps) {
  const dueDate = milestone.dueDate ? new Date(milestone.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && milestone.status !== 'completed';
  const displayStatus = isOverdue ? 'overdue' : milestone.status;

  return (
    <Card data-testid={`card-milestone-${index}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base" data-testid={`text-milestone-title-${index}`}>
              Milestone {index + 1}: {milestone.title}
            </CardTitle>
            {milestone.description && (
              <CardDescription className="mt-1">
                {milestone.description}
              </CardDescription>
            )}
          </div>
          <Badge variant={statusColors[displayStatus] as any} data-testid={`badge-milestone-status-${index}`}>
            {displayStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {milestone.progress !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium" data-testid={`text-milestone-progress-${index}`}>
                {milestone.progress}%
              </span>
            </div>
            <Progress value={milestone.progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {dueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Due Date</div>
                <div className="font-medium" data-testid={`text-milestone-due-${index}`}>
                  {formatDistanceToNow(dueDate, { addSuffix: true })}
                </div>
              </div>
            </div>
          )}
          
          {milestone.amount !== undefined && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Payment</div>
                <div className="font-medium" data-testid={`text-milestone-amount-${index}`}>
                  {currency} {milestone.amount.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-2 pt-2">
            {onUploadDeliverable && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onUploadDeliverable}
                data-testid={`button-upload-deliverable-${index}`}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Deliverable
              </Button>
            )}
            
            {onViewComments && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onViewComments}
                data-testid={`button-view-comments-${index}`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Comments ({commentsCount})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
