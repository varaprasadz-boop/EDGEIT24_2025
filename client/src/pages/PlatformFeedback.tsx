import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Lightbulb, Star, ThumbsUp, Send, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const feedbackSchema = z.object({
  feedbackType: z.enum(["bug_report", "feature_request", "improvement", "complaint", "praise"]),
  category: z.string().min(1, "Please select a category"),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide a detailed description (min 20 characters)"),
  rating: z.number().min(1).max(5).optional(),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

const featureSuggestionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide a detailed description (min 20 characters)"),
  category: z.string().min(1, "Please select a category"),
  useCase: z.string().optional(),
  expectedBenefit: z.string().optional(),
});

type FeatureSuggestionForm = z.infer<typeof featureSuggestionSchema>;

export default function PlatformFeedback() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedRating, setSelectedRating] = useState(0);

  const feedbackForm = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedbackType: "improvement",
      category: "",
      title: "",
      description: "",
      rating: undefined,
    },
  });

  const featureForm = useForm<FeatureSuggestionForm>({
    resolver: zodResolver(featureSuggestionSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      useCase: "",
      expectedBenefit: "",
    },
  });

  // Fetch feature suggestions
  const { data: featureSuggestions } = useQuery({
    queryKey: ['/api/feature-suggestions'],
  });

  // Fetch active surveys
  const { data: activeSurveys } = useQuery({
    queryKey: ['/api/surveys/active'],
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackForm) => {
      return await apiRequest("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });
      feedbackForm.reset();
      setSelectedRating(0);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  // Submit feature suggestion mutation
  const submitFeatureMutation = useMutation({
    mutationFn: async (data: FeatureSuggestionForm) => {
      return await apiRequest("/api/feature-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-suggestions'] });
      toast({
        title: "Feature Suggestion Submitted",
        description: "Thank you! Other users can now vote for your suggestion.",
      });
      featureForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit suggestion",
        variant: "destructive",
      });
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      return await apiRequest(`/api/feature-suggestions/${suggestionId}/vote`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-suggestions'] });
      toast({
        title: "Vote Recorded",
        description: "Thank you for voting!",
      });
    },
  });

  const categories = [
    { value: "ui_ux", label: "User Interface & Experience" },
    { value: "performance", label: "Performance" },
    { value: "features", label: "Features & Functionality" },
    { value: "mobile", label: "Mobile App" },
    { value: "integrations", label: "Integrations" },
    { value: "security", label: "Security & Privacy" },
    { value: "billing", label: "Billing & Payments" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-feedback-title">
          Platform Feedback
        </h1>
        <p className="text-muted-foreground" data-testid="text-feedback-subtitle">
          Help us improve EDGEIT24 by sharing your feedback and feature suggestions
        </p>
      </div>

      <Tabs defaultValue="feedback" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            <MessageSquare className="mr-2 h-4 w-4" />
            General Feedback
          </TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">
            <Lightbulb className="mr-2 h-4 w-4" />
            Feature Requests
          </TabsTrigger>
          <TabsTrigger value="surveys" data-testid="tab-surveys">
            <Star className="mr-2 h-4 w-4" />
            Surveys
          </TabsTrigger>
        </TabsList>

        {/* General Feedback Tab */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>Submit Feedback</CardTitle>
              <CardDescription>
                Share your thoughts, report bugs, or suggest improvements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...feedbackForm}>
                <form onSubmit={feedbackForm.handleSubmit((data) => submitFeedbackMutation.mutate(data))} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={feedbackForm.control}
                      name="feedbackType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feedback Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-feedback-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="bug_report">Bug Report</SelectItem>
                              <SelectItem value="feature_request">Feature Request</SelectItem>
                              <SelectItem value="improvement">Improvement Suggestion</SelectItem>
                              <SelectItem value="complaint">Complaint</SelectItem>
                              <SelectItem value="praise">Praise</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={feedbackForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={feedbackForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Brief summary of your feedback"
                            {...field}
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={feedbackForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide detailed feedback..."
                            rows={6}
                            {...field}
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <label className="text-sm font-medium mb-2 block">Overall Platform Rating (Optional)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => {
                            setSelectedRating(rating);
                            feedbackForm.setValue('rating', rating);
                          }}
                          className="hover-elevate active-elevate-2 p-1 rounded"
                          data-testid={`button-rating-${rating}`}
                        >
                          <Star
                            className={`h-8 w-8 ${
                              rating <= selectedRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitFeedbackMutation.isPending}
                    data-testid="button-submit-feedback"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Requests Tab */}
        <TabsContent value="features">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Submit Feature Request */}
            <Card>
              <CardHeader>
                <CardTitle>Suggest a Feature</CardTitle>
                <CardDescription>
                  Share your ideas for new features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...featureForm}>
                  <form onSubmit={featureForm.handleSubmit((data) => submitFeatureMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={featureForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-feature-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={featureForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feature Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Dark Mode for Mobile App"
                              {...field}
                              data-testid="input-feature-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={featureForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the feature in detail..."
                              rows={4}
                              {...field}
                              data-testid="textarea-feature-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={featureForm.control}
                      name="useCase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Use Case (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="How would you use this feature?"
                              rows={2}
                              {...field}
                              data-testid="textarea-use-case"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={submitFeatureMutation.isPending}
                      data-testid="button-submit-feature"
                    >
                      {submitFeatureMutation.isPending ? "Submitting..." : "Submit Suggestion"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Popular Feature Requests */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Popular Feature Requests</h3>
              {!featureSuggestions || featureSuggestions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No feature suggestions yet. Be the first to suggest one!
                  </CardContent>
                </Card>
              ) : (
                featureSuggestions.slice(0, 10).map((suggestion: any) => (
                  <Card key={suggestion.id} data-testid={`card-suggestion-${suggestion.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-base">{suggestion.title}</CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {suggestion.description}
                          </CardDescription>
                        </div>
                        <Badge variant={suggestion.status === 'planned' ? 'default' : 'secondary'}>
                          {suggestion.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ThumbsUp className="h-4 w-4" />
                          {suggestion.voteCount || 0} votes
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => voteMutation.mutate(suggestion.id)}
                          disabled={voteMutation.isPending}
                          data-testid={`button-vote-${suggestion.id}`}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Vote
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Surveys Tab */}
        <TabsContent value="surveys">
          <div className="space-y-4">
            {!activeSurveys || activeSurveys.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Star className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No active surveys at the moment. Check back later!
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeSurveys.map((survey: any) => (
                <Card key={survey.id} data-testid={`card-survey-${survey.id}`}>
                  <CardHeader>
                    <CardTitle>{survey.title}</CardTitle>
                    <CardDescription>{survey.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => navigate(`/surveys/${survey.id}`)}
                      data-testid={`button-take-survey-${survey.id}`}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Take Survey
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
