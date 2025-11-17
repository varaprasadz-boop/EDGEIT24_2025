import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";

interface Milestone {
  title: string;
  status: string;
  progress?: number;
}

interface ProjectProgressBarProps {
  overallProgress: number;
  milestones?: Milestone[];
  showMilestoneBreakdown?: boolean;
}

export function ProjectProgressBar({ 
  overallProgress, 
  milestones = [], 
  showMilestoneBreakdown = false 
}: ProjectProgressBarProps) {
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = milestones.length;

  return (
    <div className="space-y-2" data-testid="project-progress-bar">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Overall Progress</span>
        <span className="font-medium" data-testid="text-progress-percentage">
          {overallProgress}%
        </span>
      </div>
      
      <Progress value={overallProgress} className="h-2" data-testid="progress-bar" />
      
      {showMilestoneBreakdown && totalMilestones > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-muted-foreground">
            Milestones: {completedMilestones} of {totalMilestones} completed
          </div>
          <div className="grid gap-2">
            {milestones.map((milestone, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-sm"
                data-testid={`milestone-${index}`}
              >
                {milestone.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={milestone.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                  {milestone.title}
                </span>
                {milestone.progress !== undefined && milestone.status !== 'completed' && (
                  <span className="text-muted-foreground ml-auto">{milestone.progress}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
