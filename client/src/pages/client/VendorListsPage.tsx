import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Users, Loader2, Mail, UserPlus } from 'lucide-react';

export default function VendorListsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  const { data: listsData, isLoading } = useQuery({
    queryKey: ['/api/vendor-lists'],
  });

  const lists = (listsData as any)?.lists || [];

  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest('POST', '/api/vendor-lists', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-lists'] });
      toast({
        title: 'Success',
        description: 'Vendor list created successfully',
      });
      setCreateDialogOpen(false);
      setNewListName('');
      setNewListDescription('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create vendor list',
      });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string } }) => {
      const res = await apiRequest('PUT', `/api/vendor-lists/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-lists'] });
      toast({
        title: 'Success',
        description: 'Vendor list updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedListId(null);
      setNewListName('');
      setNewListDescription('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update vendor list',
      });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vendor-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-lists'] });
      toast({
        title: 'Success',
        description: 'Vendor list deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete vendor list',
      });
    },
  });

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a list name',
      });
      return;
    }

    createListMutation.mutate({
      name: newListName.trim(),
      description: newListDescription.trim() || undefined,
    });
  };

  const handleEditList = (list: any) => {
    setSelectedListId(list.id);
    setNewListName(list.name);
    setNewListDescription(list.description || '');
    setEditDialogOpen(true);
  };

  const handleUpdateList = () => {
    if (!selectedListId || !newListName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a list name',
      });
      return;
    }

    updateListMutation.mutate({
      id: selectedListId,
      data: {
        name: newListName.trim(),
        description: newListDescription.trim() || undefined,
      },
    });
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">My Vendor Lists</h1>
          <p className="text-muted-foreground">
            Organize and manage your preferred consultants
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-list">
          <Plus className="h-4 w-4 mr-2" />
          Create List
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : lists.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No vendor lists yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first list to organize consultants for easy access
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First List
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list: any) => (
            <VendorListCard
              key={list.id}
              list={list}
              onEdit={() => handleEditList(list)}
              onDelete={() => deleteListMutation.mutate(list.id)}
              onView={() => navigate(`/client/vendor-lists/${list.id}`)}
            />
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="create-list-dialog">
          <DialogHeader>
            <DialogTitle>Create Vendor List</DialogTitle>
            <DialogDescription>
              Create a new list to organize consultants by category, project, or any criteria you choose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., Mobile Developers, Web Designers"
                data-testid="input-list-name"
              />
            </div>
            <div>
              <Label htmlFor="list-description">Description (Optional)</Label>
              <Textarea
                id="list-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Brief description of this list"
                data-testid="textarea-list-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleCreateList} disabled={createListMutation.isPending} data-testid="button-create">
              {createListMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create List
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="edit-list-dialog">
          <DialogHeader>
            <DialogTitle>Edit Vendor List</DialogTitle>
            <DialogDescription>
              Update the name and description of your vendor list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-list-name">List Name</Label>
              <Input
                id="edit-list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name"
                data-testid="input-edit-list-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-list-description">Description (Optional)</Label>
              <Textarea
                id="edit-list-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Brief description"
                data-testid="textarea-edit-list-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleUpdateList} disabled={updateListMutation.isPending} data-testid="button-update">
              {updateListMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update List'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface VendorListCardProps {
  list: any;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

function VendorListCard({ list, onEdit, onDelete, onView }: VendorListCardProps) {
  const consultantCount = list.consultantCount || 0;

  return (
    <Card className="hover-elevate transition-all" data-testid={`vendor-list-card-${list.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold" data-testid={`list-name-${list.id}`}>{list.name}</h3>
            {list.description && (
              <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              data-testid={`button-edit-list-${list.id}`}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-list-${list.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span data-testid={`consultant-count-${list.id}`}>
            {consultantCount} {consultantCount === 1 ? 'consultant' : 'consultants'}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={onView} className="w-full" data-testid={`button-view-list-${list.id}`}>
          View List
        </Button>
      </CardFooter>
    </Card>
  );
}
