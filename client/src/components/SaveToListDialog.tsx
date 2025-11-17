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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

interface SaveToListDialogProps {
  consultantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveToListDialog({ consultantId, open, onOpenChange }: SaveToListDialogProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [notes, setNotes] = useState('');

  const { data: listsData } = useQuery({
    queryKey: ['/api/vendor-lists'],
    enabled: open,
  });

  const lists = (listsData as any)?.lists || [];

  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest('POST', '/api/vendor-lists', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-lists'] });
    },
  });

  const addToListMutation = useMutation({
    mutationFn: async ({ listId, consultantId, notes }: { listId: string; consultantId: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/vendor-lists/${listId}/consultants`, {
        consultantId,
        notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-lists'] });
      toast({
        title: 'Success',
        description: 'Consultant added to list successfully',
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add consultant to list',
      });
    },
  });

  const handleClose = () => {
    setMode('existing');
    setSelectedListId('');
    setNewListName('');
    setNewListDescription('');
    setNotes('');
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (mode === 'new') {
      if (!newListName.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please enter a list name',
        });
        return;
      }

      const newList = await createListMutation.mutateAsync({
        name: newListName.trim(),
        description: newListDescription.trim() || undefined,
      });

      addToListMutation.mutate({
        listId: newList.id,
        consultantId,
        notes: notes.trim() || undefined,
      });
    } else {
      if (!selectedListId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please select a list',
        });
        return;
      }

      addToListMutation.mutate({
        listId: selectedListId,
        consultantId,
        notes: notes.trim() || undefined,
      });
    }
  };

  const isPending = createListMutation.isPending || addToListMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="save-to-list-dialog">
        <DialogHeader>
          <DialogTitle>Save to Vendor List</DialogTitle>
          <DialogDescription>
            Add this consultant to an existing list or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={mode} onValueChange={(value: any) => setMode(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" data-testid="radio-existing-list" />
              <Label htmlFor="existing" className="cursor-pointer">Add to existing list</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" data-testid="radio-new-list" />
              <Label htmlFor="new" className="cursor-pointer">Create new list</Label>
            </div>
          </RadioGroup>

          {mode === 'existing' && (
            <div>
              <Label htmlFor="list-select">Select List</Label>
              {lists.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  No lists available. Create a new list instead.
                </p>
              ) : (
                <RadioGroup value={selectedListId} onValueChange={setSelectedListId}>
                  {lists.map((list: any) => (
                    <div key={list.id} className="flex items-center space-x-2 p-2 border rounded-md hover-elevate">
                      <RadioGroupItem value={list.id} id={`list-${list.id}`} data-testid={`radio-list-${list.id}`} />
                      <Label htmlFor={`list-${list.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{list.name}</div>
                        {list.description && (
                          <div className="text-xs text-muted-foreground">{list.description}</div>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}

          {mode === 'new' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-list-name">List Name</Label>
                <Input
                  id="new-list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Mobile Developers"
                  data-testid="input-new-list-name"
                />
              </div>
              <div>
                <Label htmlFor="new-list-description">Description (Optional)</Label>
                <Textarea
                  id="new-list-description"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Brief description of this list"
                  data-testid="textarea-new-list-description"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this consultant"
              data-testid="textarea-consultant-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} data-testid="button-save-to-list">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {mode === 'new' && <Plus className="h-4 w-4 mr-2" />}
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
