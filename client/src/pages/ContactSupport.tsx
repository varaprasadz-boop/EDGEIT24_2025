import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Upload, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const supportTicketSchema = z.object({
  category: z.string().min(1, "Please select a category"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(20, "Please provide a detailed description (min 20 characters)"),
  email: z.string().email("Please enter a valid email"),
});

type SupportTicketForm = z.infer<typeof supportTicketSchema>;

export default function ContactSupport() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<File[]>([]);

  const form = useForm<SupportTicketForm>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      category: "",
      priority: "medium",
      subject: "",
      description: "",
      email: "",
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: SupportTicketForm) => {
      const formData = new FormData();
      formData.append("category", data.category);
      formData.append("priority", data.priority);
      formData.append("subject", data.subject);
      formData.append("description", data.description);
      formData.append("email", data.email);
      
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });
      
      return await apiRequest("/api/support-tickets", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      toast({
        title: "Support Ticket Created",
        description: "Your support ticket has been submitted. We'll get back to you soon.",
      });
      navigate("/help/my-tickets");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create support ticket",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupportTicketForm) => {
    createTicketMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const categories = [
    { value: "account", label: "Account & Login Issues" },
    { value: "billing", label: "Billing & Payments" },
    { value: "technical", label: "Technical Issues" },
    { value: "project", label: "Project Management" },
    { value: "verification", label: "Verification & Approval" },
    { value: "feature", label: "Feature Request" },
    { value: "report", label: "Report a Problem" },
    { value: "other", label: "Other" },
  ];

  return (
    <UserLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-contact-support-title">
          Contact Support
        </h1>
        <p className="text-muted-foreground" data-testid="text-contact-support-subtitle">
          Submit a support ticket and our team will get back to you as soon as possible.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Support Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Submit Support Ticket
              </CardTitle>
              <CardDescription>
                Fill out the form below with details about your issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your.email@example.com"
                            {...field}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormDescription>
                          We'll send updates to this email
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select a category" />
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
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Brief summary of your issue"
                            {...field}
                            data-testid="input-subject"
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
                            placeholder="Please provide as much detail as possible about your issue..."
                            rows={8}
                            {...field}
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormDescription>
                          Include any relevant details, error messages, or steps to reproduce the issue
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Attachments Section */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Attachments (Optional)</label>
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <div className="flex items-center justify-center">
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer hover-elevate active-elevate-2 px-4 py-2 border rounded-md inline-flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Choose Files</span>
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileChange}
                          data-testid="input-file-upload"
                        />
                      </div>
                      {attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-muted rounded"
                              data-testid={`attachment-${index}`}
                            >
                              <span className="text-sm truncate">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                                data-testid={`button-remove-attachment-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You can attach screenshots, logs, or other relevant files
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={createTicketMutation.isPending}
                      data-testid="button-submit-ticket"
                    >
                      {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/help")}
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

        {/* Help Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Response Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Urgent:</span>
                <span className="text-sm font-medium">1-2 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">High:</span>
                <span className="text-sm font-medium">2-4 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Medium:</span>
                <span className="text-sm font-medium">4-8 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Low:</span>
                <span className="text-sm font-medium">24 hours</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Before You Submit</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Check our FAQ for quick answers</li>
                <li>• Search the Knowledge Base</li>
                <li>• Include error messages if any</li>
                <li>• Attach relevant screenshots</li>
                <li>• Provide step-by-step details</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </UserLayout>
  );
}
