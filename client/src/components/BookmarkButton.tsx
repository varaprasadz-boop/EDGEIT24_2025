import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BookmarkButtonProps {
  jobId: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  showLabel?: boolean;
  className?: string;
}

export function BookmarkButton({
  jobId,
  size = "icon",
  variant = "ghost",
  showLabel = false,
  className = "",
}: BookmarkButtonProps) {
  const { toast } = useToast();

  // Check if job is already saved - returns {saved: boolean, savedRequirement?: {...}}
  const { data: checkResponse, isLoading } = useQuery<{
    saved: boolean;
    savedRequirement?: { id: string; notes?: string | null };
  }>({
    queryKey: ['/api/saved-requirements/check', jobId],
  });

  const isSaved = checkResponse?.saved ?? false;
  const savedRequirementId = checkResponse?.savedRequirement?.id;

  // Save job mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response: any = await apiRequest('POST', '/api/saved-requirements', {
        jobId,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-requirements/check', jobId] });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-requirements'] });
      toast({
        title: "Job saved",
        description: "Added to your saved requirements.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save job. Please try again.",
      });
    },
  });

  // Unsave job mutation
  const unsaveMutation = useMutation({
    mutationFn: async () => {
      if (!savedRequirementId) {
        throw new Error('Saved requirement ID not found');
      }
      await apiRequest('DELETE', `/api/saved-requirements/${savedRequirementId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-requirements/check', jobId] });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-requirements'] });
      toast({
        title: "Job removed",
        description: "Removed from your saved requirements.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove job. Please try again.",
      });
    },
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSaved) {
      unsaveMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  const isPending = saveMutation.isPending || unsaveMutation.isPending;

  const button = (
    <Button
      size={size}
      variant={variant}
      onClick={handleToggle}
      disabled={isLoading || isPending}
      className={className}
      data-testid={`button-bookmark-${jobId}`}
    >
      <Bookmark
        className={isSaved ? "fill-current" : ""}
        data-testid={`icon-bookmark-${isSaved ? 'filled' : 'outline'}`}
      />
      {showLabel && <span className="ml-2">{isSaved ? "Saved" : "Save"}</span>}
    </Button>
  );

  if (!showLabel && size === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{isSaved ? "Remove from saved" : "Save for later"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
