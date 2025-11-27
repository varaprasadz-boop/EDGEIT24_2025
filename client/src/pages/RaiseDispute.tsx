import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, FileText } from "lucide-react";
import type { Project } from "@shared/schema";

const disputeFormSchema = z.object({
  projectId: z.string().uuid({ message: "Please select a project" }),
  disputeType: z.enum(['payment_dispute', 'quality_dispute', 'delivery_dispute', 'refund_request', 'contract_violation']),
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  desiredResolution: z.string().max(2000).optional(),
});

type DisputeFormValues = z.infer<typeof disputeFormSchema>;

export default function RaiseDispute() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const form = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: {
      projectId: "",
      disputeType: "quality_dispute",
      title: "",
      description: "",
      desiredResolution: "",
    },
  });

  // Fetch user's active projects
  const { data, isLoading: projectsLoading } = useQuery<{ projects: Project[]; total: number }>({
    queryKey: ['/api/projects/my-projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects/my-projects?status=in_progress', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });
  
  const projects = data?.projects ?? [];

  const createDisputeMutation = useMutation({
    mutationFn: (data: DisputeFormValues) => apiRequest('POST', '/api/disputes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disputes'] });
      toast({
        title: "Dispute Raised",
        description: "Your dispute has been submitted successfully. An admin will review it shortly.",
      });
      navigate('/my-disputes');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to raise dispute",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DisputeFormValues) => {
    createDisputeMutation.mutate(data);
  };

  return (
    <UserLayout>
      <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle data-testid="title-raise-dispute">Raise a Dispute</CardTitle>
          </div>
          <CardDescription>
            Submit a dispute for review. Please provide as much detail as possible to help us resolve the issue quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedProjectId(value);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectsLoading && (
                          <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                        )}
                        {projects.map((project: Project) => (
                          <SelectItem 
                            key={project.id} 
                            value={project.id}
                            data-testid={`option-project-${project.id}`}
                          >
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disputeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dispute Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-dispute-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="payment_dispute">Payment Dispute</SelectItem>
                        <SelectItem value="quality_dispute">Quality Dispute</SelectItem>
                        <SelectItem value="delivery_dispute">Delivery Dispute</SelectItem>
                        <SelectItem value="refund_request">Refund Request</SelectItem>
                        <SelectItem value="contract_violation">Contract Violation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief summary of the issue" 
                        {...field} 
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide detailed information about the dispute..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="desiredResolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desired Resolution (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What outcome would you like to see?"
                        className="min-h-[100px]"
                        {...field}
                        data-testid="textarea-resolution"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={createDisputeMutation.isPending}
                  data-testid="button-submit"
                >
                  {createDisputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/my-disputes')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      </div>
    </UserLayout>
  );
}
