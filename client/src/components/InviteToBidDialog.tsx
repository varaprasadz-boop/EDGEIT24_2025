import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InviteToBidDialogProps {
  consultantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteToBidDialog({ consultantId, open, onOpenChange }: InviteToBidDialogProps) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [message, setMessage] = useState('');

  const { data: projectsData } = useQuery({
    queryKey: ['/api/jobs'],
    enabled: open,
  });

  const projects = ((projectsData as any)?.jobs || []).filter(
    (job: any) => job.status === 'open'
  );

  const inviteMutation = useMutation({
    mutationFn: async ({ projectId, consultantId, message }: { projectId: string; consultantId: string; message?: string }) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/invite-consultant`, {
        consultantId,
        message,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send invitation',
      });
    },
  });

  const handleClose = () => {
    setSelectedProjectId('');
    setMessage('');
    onOpenChange(false);
  };

  const handleInvite = () => {
    if (!selectedProjectId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a project',
      });
      return;
    }

    inviteMutation.mutate({
      projectId: selectedProjectId,
      consultantId,
      message: message.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="invite-to-bid-dialog">
        <DialogHeader>
          <DialogTitle>Invite to Bid</DialogTitle>
          <DialogDescription>
            Select a project to invite this consultant to submit a proposal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Select Project</Label>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">
                You don't have any open projects. Create a project first to invite consultants.
              </p>
            ) : (
              <RadioGroup value={selectedProjectId} onValueChange={setSelectedProjectId}>
                {projects.map((project: any) => (
                  <div key={project.id} className="flex items-start space-x-2 p-3 border rounded-md hover-elevate">
                    <RadioGroupItem value={project.id} id={`project-${project.id}`} className="mt-1" data-testid={`radio-project-${project.id}`} />
                    <Label htmlFor={`project-${project.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium">{project.title}</div>
                          {project.category && (
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{project.category}</Badge>
                              {project.budget && (
                                <Badge variant="secondary" className="text-xs">
                                  SAR {project.budget.toLocaleString()}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <div>
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to encourage the consultant to bid on your project..."
              rows={4}
              data-testid="textarea-invitation-message"
            />
            <p className="text-xs text-muted-foreground mt-1">
              A personalized message can increase the response rate
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={inviteMutation.isPending} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={inviteMutation.isPending || projects.length === 0} data-testid="button-send-invitation">
            {inviteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Briefcase className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
