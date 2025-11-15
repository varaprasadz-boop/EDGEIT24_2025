import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CascadingCategorySelector } from "@/components/CascadingCategorySelector";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Briefcase, ArrowLeft } from "lucide-react";
import { insertJobSchema } from "@shared/schema";

// Extend schema with validation
const postJobSchema = insertJobSchema.extend({
  categoryId: z.string().min(1, "Please select a service category"),
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
});

type PostJobFormData = z.infer<typeof postJobSchema>;

export default function PostJob() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [categoryPath, setCategoryPath] = useState<string>("");

  const form = useForm<PostJobFormData>({
    resolver: zodResolver(postJobSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      budgetType: "negotiable",
      budget: undefined,
      status: "open",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: PostJobFormData) => {
      const response = await apiRequest('POST', '/api/jobs', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to post job');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Job posted successfully",
        description: "Your job has been published and is now visible to consultants.",
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PostJobFormData) => {
    createJobMutation.mutate(data);
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/dashboard')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Post a New Job</h1>
          <p className="text-muted-foreground">
            Describe your project and find the right consultant
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Job Details
              </CardTitle>
              <CardDescription>
                Provide clear information about your project requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Category</FormLabel>
                    <FormControl>
                      <CascadingCategorySelector
                        value={field.value}
                        onChange={(categoryId, path) => {
                          field.onChange(categoryId);
                          if (path) setCategoryPath(path);
                        }}
                        disabled={createJobMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Build a responsive e-commerce website"
                        disabled={createJobMutation.isPending}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormDescription>
                      A clear, descriptive title for your project
                    </FormDescription>
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
                        {...field}
                        placeholder="Describe your project requirements, goals, and expectations..."
                        rows={6}
                        disabled={createJobMutation.isPending}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Provide detailed information to help consultants understand your needs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="budgetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                        disabled={createJobMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-budget-type">
                            <SelectValue placeholder="Select budget type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Price</SelectItem>
                          <SelectItem value="hourly">Hourly Rate</SelectItem>
                          <SelectItem value="negotiable">Negotiable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (SAR)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="number"
                          placeholder="e.g., 5000"
                          disabled={createJobMutation.isPending}
                          data-testid="input-budget"
                        />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/dashboard')}
              disabled={createJobMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createJobMutation.isPending}
              data-testid="button-submit"
            >
              {createJobMutation.isPending ? "Posting..." : "Post Job"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
