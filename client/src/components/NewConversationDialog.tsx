import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquarePlus } from "lucide-react";

type NewConversationDialogProps = {
  trigger?: React.ReactNode;
};

export function NewConversationDialog({ trigger }: NewConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const createConversationMutation = useMutation({
    mutationFn: async (data: { title: string | null; isGroup: boolean }) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return await response.json();
    },
    onSuccess: async (conversation: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setOpen(false);
      setTitle("");
      setIsGroup(false);
      setParticipantEmail("");
      
      toast({
        title: "Conversation created",
        description: "Your conversation has been created successfully.",
      });
      
      // Navigate to the new conversation
      setLocation(`/messages/${conversation.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createConversationMutation.mutate({
      title: title.trim() || null,
      isGroup,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-new-conversation-trigger"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-new-conversation">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Start a new conversation with a participant or create a group chat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Conversation Title (Optional)</Label>
              <Input
                id="title"
                placeholder="Enter a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-conversation-title"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isGroup">Group Conversation</Label>
                <p className="text-sm text-muted-foreground">
                  Enable for multiple participants
                </p>
              </div>
              <Switch
                id="isGroup"
                checked={isGroup}
                onCheckedChange={setIsGroup}
                data-testid="switch-is-group"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="participant">Participant Email (Optional)</Label>
              <Input
                id="participant"
                type="email"
                placeholder="user@example.com"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                data-testid="input-participant-email"
              />
              <p className="text-xs text-muted-foreground">
                You can add participants after creating the conversation
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createConversationMutation.isPending}
              data-testid="button-create-conversation"
            >
              {createConversationMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
