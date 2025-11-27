import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserLayout } from '@/components/UserLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { 
  Bookmark, 
  BookmarkX, 
  Calendar, 
  DollarSign, 
  FileText, 
  Loader2, 
  Building2,
  Tag,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SavedRequirement {
  id: string;
  consultantId: string;
  jobId: string;
  notes: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    description: string;
    budget: string | null;
    budgetType: string | null;
    deadline: string | null;
    status: string;
    createdAt: string;
    category: {
      id: string;
      name: string;
    } | null;
    client: {
      id: string;
      fullName: string;
      companyName: string | null;
    } | null;
  } | null;
}

export default function SavedRequirementsPage() {
  const { toast } = useToast();
  const [unsaveDialogOpen, setUnsaveDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedSaved, setSelectedSaved] = useState<SavedRequirement | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery<{ savedRequirements: SavedRequirement[] }>({
    queryKey: ['/api/saved-requirements'],
  });

  const savedRequirements = data?.savedRequirements ?? [];

  const handleUnsave = async (id: string) => {
    try {
      await apiRequest('DELETE', `/api/saved-requirements/${id}`);

      await queryClient.invalidateQueries({ queryKey: ['/api/saved-requirements'] });

      toast({
        title: "Job unsaved",
        description: "The job has been removed from your saved list.",
      });
      setUnsaveDialogOpen(false);
      setSelectedSaved(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to unsave job. Please try again.",
      });
    }
  };

  const handleOpenNotesDialog = (saved: SavedRequirement) => {
    setSelectedSaved(saved);
    setNotes(saved.notes || '');
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedSaved) return;

    setIsSaving(true);
    try {
      await apiRequest('PATCH', `/api/saved-requirements/${selectedSaved.id}/notes`, { notes });

      await queryClient.invalidateQueries({ queryKey: ['/api/saved-requirements'] });

      toast({
        title: "Notes saved",
        description: "Your notes have been updated successfully.",
      });
      setNotesDialogOpen(false);
      setSelectedSaved(null);
      setNotes('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save notes. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="heading-saved-requirements">Saved Jobs</h1>
        <p className="text-muted-foreground">
          Manage your bookmarked job postings and add private notes
        </p>
      </div>

      {savedRequirements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved jobs yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              When you bookmark jobs, they'll appear here for easy access
            </p>
            <Link href="/consultant/find-projects">
              <Button data-testid="button-browse-jobs">Browse Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedRequirements.map((saved) => {
            const job = saved.job;
            if (!job) return null;

            return (
              <Card key={saved.id} className="flex flex-col" data-testid={`card-saved-job-${saved.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {job.title}
                    </CardTitle>
                    <Badge className={getStatusColor(job.status)} data-testid={`badge-status-${saved.id}`}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {job.category && (
                    <CardDescription className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {job.category.name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {job.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    {job.budget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{job.budget} SAR</span>
                        {job.budgetType && (
                          <span className="text-muted-foreground">({job.budgetType})</span>
                        )}
                      </div>
                    )}
                    {job.deadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Due {formatDistanceToNow(new Date(job.deadline), { addSuffix: true })}</span>
                      </div>
                    )}
                    {job.client && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{job.client.companyName || job.client.fullName}</span>
                      </div>
                    )}
                  </div>

                  {saved.notes && (
                    <div className="mt-3 p-3 rounded-md bg-muted">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm line-clamp-2">{saved.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <div className="flex gap-2 w-full">
                    <Link href={`/jobs/${job.id}`} className="flex-1">
                      <Button 
                        variant="default" 
                        className="w-full" 
                        size="sm"
                        data-testid={`button-view-job-${saved.id}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Job
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNotesDialog(saved)}
                      data-testid={`button-edit-notes-${saved.id}`}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSaved(saved);
                        setUnsaveDialogOpen(true);
                      }}
                      data-testid={`button-unsave-${saved.id}`}
                    >
                      <BookmarkX className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center w-full">
                    Saved {formatDistanceToNow(new Date(saved.createdAt), { addSuffix: true })}
                  </p>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Unsave Confirmation Dialog */}
      <AlertDialog open={unsaveDialogOpen} onOpenChange={setUnsaveDialogOpen}>
        <AlertDialogContent data-testid="dialog-unsave-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from saved jobs?</AlertDialogTitle>
            <AlertDialogDescription>
              This job will be removed from your saved list. You can always bookmark it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-unsave">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSaved && handleUnsave(selectedSaved.id)}
              data-testid="button-confirm-unsave"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent data-testid="dialog-edit-notes">
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Add private notes about this job for your reference
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              maxLength={2000}
              data-testid="input-notes"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {notes.length} / 2000 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNotesDialogOpen(false);
                setNotes('');
                setSelectedSaved(null);
              }}
              disabled={isSaving}
              data-testid="button-cancel-notes"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={isSaving}
              data-testid="button-save-notes"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </UserLayout>
  );
}
