import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Circle,
  Building2,
  FileText,
  GraduationCap,
  CreditCard,
  ArrowRight,
  AlertCircle,
  Loader2
} from "lucide-react";

type Section = "kyc" | "education" | "bank" | "business";

const sections: { id: Section; title: string; description: string; icon: typeof Building2 }[] = [
  {
    id: "kyc",
    title: "KYC Verification",
    description: "Identity verification documents",
    icon: FileText
  },
  {
    id: "education",
    title: "Education & Certifications",
    description: "Your qualifications and credentials",
    icon: GraduationCap
  },
  {
    id: "bank",
    title: "Bank Information",
    description: "Payment and withdrawal details",
    icon: CreditCard
  },
  {
    id: "business",
    title: "Business Information",
    description: "Company and service details",
    icon: Building2
  }
];

// Business Info form schema (simplified for MVP)
const businessInfoSchema = z.object({
  companyName: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  location: z.string().optional(),
  // Consultant-specific fields
  title: z.string().optional(),
  bio: z.string().optional(),
  hourlyRate: z.string().optional(),
  experience: z.string().optional(),
});

type BusinessInfo = z.infer<typeof businessInfoSchema>;

export default function ProfileCompletion() {
  const { user, isAuthenticated, isLoading: authLoading, getProfileStatus, getApprovalStatus } = useAuthContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState<Section>("kyc");
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());

  // Check authentication and approval status
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Redirect if already approved
  useEffect(() => {
    if (user) {
      const clientApprovalStatus = getApprovalStatus("client");
      const consultantApprovalStatus = getApprovalStatus("consultant");
      
      if (clientApprovalStatus === "approved" || consultantApprovalStatus === "approved") {
        setLocation("/dashboard");
      }
    }
  }, [user, getApprovalStatus, setLocation]);

  // Determine user's role for profile completion
  const isClient = user?.role === "client" || user?.role === "both";
  const isConsultant = user?.role === "consultant" || user?.role === "both";

  // Fetch existing profile data
  const { data: clientProfile } = useQuery<any>({
    queryKey: ["/api/profile/client"],
    enabled: !!user && isClient,
    retry: false,
  });

  const { data: consultantProfile } = useQuery<any>({
    queryKey: ["/api/profile/consultant"],
    enabled: !!user && isConsultant,
    retry: false,
  });

  // Business info form
  const form = useForm<BusinessInfo>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      companyName: user?.companyName || "",
      industry: clientProfile?.industry || "",
      companySize: clientProfile?.companySize || "",
      website: clientProfile?.website || consultantProfile?.website || "",
      description: clientProfile?.description || "",
      location: clientProfile?.location || consultantProfile?.location || "",
      title: consultantProfile?.title || "",
      bio: consultantProfile?.bio || "",
      hourlyRate: consultantProfile?.hourlyRate?.toString() || "",
      experience: consultantProfile?.experience || "",
    },
  });

  // Update mutation for business info
  const updateBusinessMutation = useMutation({
    mutationFn: async (data: BusinessInfo) => {
      if (isClient && !isConsultant) {
        // Client only
        return await apiRequest("PUT", "/api/profile/client", {
          companyName: data.companyName,
          industry: data.industry,
          companySize: data.companySize,
          website: data.website,
          description: data.description,
          location: data.location,
        });
      } else if (isConsultant && !isClient) {
        // Consultant only
        return await apiRequest("PUT", "/api/profile/consultant", {
          fullName: user?.fullName,
          title: data.title,
          bio: data.bio,
          hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          experience: data.experience,
          website: data.website,
          location: data.location,
        });
      } else {
        // Both roles - update both profiles
        await apiRequest("PUT", "/api/profile/client", {
          companyName: data.companyName,
          industry: data.industry,
          companySize: data.companySize,
          website: data.website,
          description: data.description,
          location: data.location,
        });
        return await apiRequest("PUT", "/api/profile/consultant", {
          fullName: user?.fullName,
          title: data.title,
          bio: data.bio,
          hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          experience: data.experience,
          website: data.website,
          location: data.location,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/client"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/consultant"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Profile Updated",
        description: "Your business information has been saved successfully.",
      });

      // Mark business section as complete and move to next section (or show submit button)
      handleSectionComplete("business");
    },
  });

  const handleSectionComplete = (section: Section) => {
    setCompletedSections(prev => new Set<Section>([...Array.from(prev), section]));
    
    // Move to next section
    const currentIndex = sections.findIndex(s => s.id === section);
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1].id);
    }
  };

  // Auto-complete stub sections (KYC, Education, Bank) immediately when viewed
  useEffect(() => {
    const stubSections: Section[] = ["kyc", "education", "bank"];
    if (stubSections.includes(currentSection) && !completedSections.has(currentSection)) {
      // Mark stub section as complete immediately
      setCompletedSections(prev => new Set<Section>([...Array.from(prev), currentSection]));
    }
  }, [currentSection, completedSections]);

  const handleBusinessSubmit = (data: BusinessInfo) => {
    updateBusinessMutation.mutate(data);
  };

  const handleSubmitForReview = async () => {
    try {
      // Submit profile for admin review
      if (isClient) {
        await apiRequest("POST", "/api/profiles/client/submit", {});
      }
      if (isConsultant) {
        await apiRequest("POST", "/api/profiles/consultant/submit", {});
      }

      toast({
        title: "Profile Submitted",
        description: "Your profile has been submitted for admin review. You'll be notified once approved.",
      });

      // Refresh user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to dashboard
      setLocation("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Failed to submit profile for review. Please try again.",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const progress = (completedSections.size / sections.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-profile-title">Complete Your Profile</h1>
              <p className="text-muted-foreground" data-testid="text-profile-subtitle">
                Provide additional information to activate your account
              </p>
            </div>
            <Badge variant="outline" data-testid="badge-profile-progress">
              {completedSections.size} of {sections.length} sections completed
            </Badge>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2" data-testid="progress-profile" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Section Navigation */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isCompleted = completedSections.has(section.id);
                  const isCurrent = currentSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`w-full text-left p-3 rounded-md transition-colors flex items-start gap-3 ${
                        isCurrent ? "bg-primary/10 border border-primary/20" : "hover-elevate"
                      }`}
                      data-testid={`button-section-${section.id}`}
                    >
                      <div className="mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="font-medium text-sm">{section.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Section Content */}
          <div className="md:col-span-3">
            {/* KYC Section */}
            {currentSection === "kyc" && (
              <Card data-testid="card-kyc-section">
                <CardHeader>
                  <CardTitle>KYC Verification</CardTitle>
                  <CardDescription>Identity verification documents (Coming Soon)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      KYC document upload functionality will be available soon. You can skip this section for now and complete it later.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button
                      onClick={() => handleSectionComplete("kyc")}
                      data-testid="button-skip-kyc"
                    >
                      Skip for Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education Section */}
            {currentSection === "education" && (
              <Card data-testid="card-education-section">
                <CardHeader>
                  <CardTitle>Education & Certifications</CardTitle>
                  <CardDescription>Your qualifications and credentials (Coming Soon)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Education and certification management will be available soon. You can skip this section for now and complete it later.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === "education");
                        if (currentIndex > 0) {
                          setCurrentSection(sections[currentIndex - 1].id);
                        }
                      }}
                      data-testid="button-back-education"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => handleSectionComplete("education")}
                      data-testid="button-skip-education"
                    >
                      Skip for Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bank Info Section */}
            {currentSection === "bank" && (
              <Card data-testid="card-bank-section">
                <CardHeader>
                  <CardTitle>Bank Information</CardTitle>
                  <CardDescription>Payment and withdrawal details (Coming Soon)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Bank account setup for payment processing will be available soon. You can skip this section for now and complete it later.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === "bank");
                        if (currentIndex > 0) {
                          setCurrentSection(sections[currentIndex - 1].id);
                        }
                      }}
                      data-testid="button-back-bank"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => handleSectionComplete("bank")}
                      data-testid="button-skip-bank"
                    >
                      Skip for Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Business Info Section */}
            {currentSection === "business" && (
              <Card data-testid="card-business-section">
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>
                    {isClient && !isConsultant && "Your company and business details"}
                    {isConsultant && !isClient && "Your professional profile and service details"}
                    {isClient && isConsultant && "Your company and professional details"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleBusinessSubmit)} className="space-y-6">
                      {/* Client-specific fields */}
                      {isClient && (
                        <>
                          <FormField
                            control={form.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-company-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="industry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Industry</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-industry">
                                      <SelectValue placeholder="Select industry" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="technology">Technology</SelectItem>
                                    <SelectItem value="finance">Finance</SelectItem>
                                    <SelectItem value="healthcare">Healthcare</SelectItem>
                                    <SelectItem value="retail">Retail</SelectItem>
                                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="companySize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Size</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-company-size">
                                      <SelectValue placeholder="Select company size" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1-10">1-10 employees</SelectItem>
                                    <SelectItem value="11-50">11-50 employees</SelectItem>
                                    <SelectItem value="51-200">51-200 employees</SelectItem>
                                    <SelectItem value="201-500">201-500 employees</SelectItem>
                                    <SelectItem value="500+">500+ employees</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Tell us about your company"
                                    data-testid="textarea-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      {/* Consultant-specific fields */}
                      {isConsultant && (
                        <>
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Professional Title</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g., Senior Full-Stack Developer"
                                    data-testid="input-title"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Professional Bio</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Tell us about your experience and expertise"
                                    data-testid="textarea-bio"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="hourlyRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Hourly Rate (SAR)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      data-testid="input-hourly-rate"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="experience"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Experience Level</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-experience">
                                        <SelectValue placeholder="Select level" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                                      <SelectItem value="mid">Mid-Level (2-5 years)</SelectItem>
                                      <SelectItem value="senior">Senior (5-10 years)</SelectItem>
                                      <SelectItem value="expert">Expert (10+ years)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}

                      {/* Common fields */}
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="url"
                                placeholder="https://example.com"
                                data-testid="input-website"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="City, Country" data-testid="input-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const currentIndex = sections.findIndex(s => s.id === "business");
                            if (currentIndex > 0) {
                              setCurrentSection(sections[currentIndex - 1].id);
                            }
                          }}
                          data-testid="button-back-business"
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateBusinessMutation.isPending}
                          data-testid="button-save-business"
                        >
                          {updateBusinessMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              Save & Continue
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Submit for Review */}
            {completedSections.size === sections.length && (
              <Card className="mt-8 border-primary/20" data-testid="card-submit-review">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                    Profile Complete
                  </CardTitle>
                  <CardDescription>
                    All sections completed. Submit your profile for admin review to activate your account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleSubmitForReview}
                    size="lg"
                    className="w-full md:w-auto bg-primary text-primary-foreground"
                    data-testid="button-submit-review"
                  >
                    Submit for Review
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
