import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, X, Upload, FileText, Users, Package, Settings, DollarSign } from "lucide-react";
import type { Job } from "@shared/schema";

const bidTypeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("service"),
    teamSize: z.number().min(1),
    keyPersonnel: z.array(z.object({
      role: z.string(),
      name: z.string(),
      experience: z.string(),
    })),
    methodology: z.string(),
    deliverables: z.array(z.string()),
    timeline: z.string(),
  }),
  z.object({
    type: z.literal("hardware"),
    productSpecs: z.string(),
    manufacturer: z.string(),
    warrantyPeriod: z.string(),
    certifications: z.array(z.string()),
    deliveryTimeline: z.string(),
  }),
  z.object({
    type: z.literal("software"),
    licensingModel: z.string(),
    userCapacity: z.number(),
    supportLevel: z.string(),
    slaTerms: z.string(),
    implementationTimeline: z.string(),
  }),
]);

const bidFormSchema = z.object({
  coverLetter: z.string().min(50, "Cover letter must be at least 50 characters"),
  proposedBudget: z.coerce.number().positive("Budget must be positive"),
  proposedDuration: z.string().optional(),
  bidType: z.enum(["service", "hardware", "software"]),
  proposalData: bidTypeSchema,
  pricingBreakdown: z.array(z.object({
    item: z.string(),
    quantity: z.coerce.number().min(1),
    unitPrice: z.coerce.number().positive(),
    total: z.coerce.number().positive(),
  })).optional(),
  milestones: z.array(z.object({
    description: z.string(),
    dueDate: z.string(),
    payment: z.coerce.number().positive(),
  })).optional(),
});

type BidFormValues = z.infer<typeof bidFormSchema>;

interface BidSubmissionDialogProps {
  job: Job;
  open: boolean;
  onClose: () => void;
}

export function BidSubmissionDialog({ job, open, onClose }: BidSubmissionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");
  const [personnel, setPersonnel] = useState<Array<{ role: string; name: string; experience: string }>>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [pricingItems, setPricingItems] = useState<Array<{ item: string; quantity: number; unitPrice: string; total: string }>>([]);
  const [milestones, setMilestones] = useState<Array<{ description: string; dueDate: string; payment: string }>>([]);

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      coverLetter: "",
      proposedBudget: "",
      proposedDuration: "",
      bidType: "service",
      proposalData: {
        type: "service",
        teamSize: 1,
        keyPersonnel: [],
        methodology: "",
        deliverables: [],
        timeline: "",
      },
      pricingBreakdown: [],
      milestones: [],
    },
  });

  const bidType = form.watch("bidType");

  // Normalize proposalData and reset auxiliary state when bidType changes
  useEffect(() => {
    const currentType = form.getValues("proposalData").type;
    if (currentType !== bidType) {
      // Reset auxiliary state to prevent stale data
      setPersonnel([]);
      setCertifications([]);
      setPricingItems([]);
      setMilestones([]);

      if (bidType === "service") {
        form.setValue("proposalData", {
          type: "service",
          teamSize: 1,
          keyPersonnel: [],
          methodology: "",
          deliverables: [],
          timeline: "",
        });
      } else if (bidType === "hardware") {
        form.setValue("proposalData", {
          type: "hardware",
          productSpecs: "",
          manufacturer: "",
          warrantyPeriod: "",
          certifications: [],
          deliveryTimeline: "",
        });
      } else {
        form.setValue("proposalData", {
          type: "software",
          licensingModel: "",
          userCapacity: 0,
          supportLevel: "",
          slaTerms: "",
          implementationTimeline: "",
        });
      }
    }
  }, [bidType, form]);

  const submitBidMutation = useMutation({
    mutationFn: async (data: BidFormValues) => {
      return await apiRequest("POST", `/api/bids`, {
        jobId: job.id,
        ...data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Bid submitted successfully",
        description: "Your bid has been submitted and is now under review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consultant/bids"] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit bid",
        description: error.message || "An error occurred while submitting your bid.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BidFormValues) => {
    const finalData = {
      ...data,
      pricingBreakdown: pricingItems.length > 0 ? pricingItems.map(item => ({
        item: item.item,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.total) || 0,
      })) : undefined,
      milestones: milestones.length > 0 ? milestones.map(m => ({
        description: m.description,
        dueDate: m.dueDate,
        payment: Number(m.payment) || 0,
      })) : undefined,
    };

    if (bidType === "service") {
      finalData.proposalData = {
        type: "service" as const,
        teamSize: personnel.length || 1,
        keyPersonnel: personnel,
        methodology: data.proposalData.type === "service" ? data.proposalData.methodology : "",
        deliverables: data.proposalData.type === "service" ? data.proposalData.deliverables : [],
        timeline: data.proposalData.type === "service" ? data.proposalData.timeline : "",
      };
    } else if (bidType === "hardware") {
      finalData.proposalData = {
        type: "hardware" as const,
        productSpecs: data.proposalData.type === "hardware" ? data.proposalData.productSpecs : "",
        manufacturer: data.proposalData.type === "hardware" ? data.proposalData.manufacturer : "",
        warrantyPeriod: data.proposalData.type === "hardware" ? data.proposalData.warrantyPeriod : "",
        certifications: certifications,
        deliveryTimeline: data.proposalData.type === "hardware" ? data.proposalData.deliveryTimeline : "",
      };
    } else {
      finalData.proposalData = {
        type: "software" as const,
        licensingModel: data.proposalData.type === "software" ? data.proposalData.licensingModel : "",
        userCapacity: data.proposalData.type === "software" ? data.proposalData.userCapacity : 0,
        supportLevel: data.proposalData.type === "software" ? data.proposalData.supportLevel : "",
        slaTerms: data.proposalData.type === "software" ? data.proposalData.slaTerms : "",
        implementationTimeline: data.proposalData.type === "software" ? data.proposalData.implementationTimeline : "",
      };
    }

    submitBidMutation.mutate(finalData);
  };

  const addPersonnel = () => {
    setPersonnel([...personnel, { role: "", name: "", experience: "" }]);
  };

  const removePersonnel = (index: number) => {
    setPersonnel(personnel.filter((_, i) => i !== index));
  };

  const addCertification = (cert: string) => {
    if (cert && !certifications.includes(cert)) {
      setCertifications([...certifications, cert]);
    }
  };

  const addPricingItem = () => {
    setPricingItems([...pricingItems, { item: "", quantity: 1, unitPrice: "", total: "" }]);
  };

  const removePricingItem = (index: number) => {
    setPricingItems(pricingItems.filter((_, i) => i !== index));
  };

  const addMilestone = () => {
    setMilestones([...milestones, { description: "", dueDate: "", payment: "" }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="title-bid-submission">Submit Bid for {job.title}</DialogTitle>
          <DialogDescription>
            Provide detailed information about your proposal for this project
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
                <TabsTrigger value="proposal" data-testid="tab-proposal">Proposal</TabsTrigger>
                <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
                <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="bidType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bid Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bid-type">
                            <SelectValue placeholder="Select bid type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="service">Service-Based</SelectItem>
                          <SelectItem value="hardware">Hardware Supply</SelectItem>
                          <SelectItem value="software">Software License</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the type of bid based on the project requirements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proposedBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposed Budget (SAR)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Enter your proposed budget"
                          data-testid="input-budget"
                        />
                      </FormControl>
                      <FormDescription>
                        Job budget: ﷼{job.budget ? parseFloat(job.budget).toLocaleString() : "Not specified"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proposedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposed Duration</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 4 weeks, 2 months"
                          data-testid="input-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverLetter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Letter</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Explain why you're the best fit for this project..."
                          rows={6}
                          data-testid="textarea-cover-letter"
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 50 characters. Highlight your relevant experience and approach.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="proposal" className="space-y-4 mt-4">
                {bidType === "service" && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Team Composition
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {personnel.map((person, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <Input
                              placeholder="Role"
                              value={person.role}
                              onChange={(e) => {
                                const newPersonnel = [...personnel];
                                newPersonnel[index].role = e.target.value;
                                setPersonnel(newPersonnel);
                              }}
                              data-testid={`input-role-${index}`}
                            />
                            <Input
                              placeholder="Name"
                              value={person.name}
                              onChange={(e) => {
                                const newPersonnel = [...personnel];
                                newPersonnel[index].name = e.target.value;
                                setPersonnel(newPersonnel);
                              }}
                              data-testid={`input-name-${index}`}
                            />
                            <Input
                              placeholder="Experience"
                              value={person.experience}
                              onChange={(e) => {
                                const newPersonnel = [...personnel];
                                newPersonnel[index].experience = e.target.value;
                                setPersonnel(newPersonnel);
                              }}
                              data-testid={`input-experience-${index}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePersonnel(index)}
                              data-testid={`button-remove-personnel-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addPersonnel}
                          data-testid="button-add-personnel"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Team Member
                        </Button>
                      </CardContent>
                    </Card>

                    <FormField
                      control={form.control}
                      name="proposalData.methodology"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Methodology & Approach</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={form.watch("proposalData")?.type === "service" ? form.watch("proposalData.methodology") : ""}
                              onChange={(e) => {
                                const currentData = form.watch("proposalData");
                                if (currentData?.type === "service") {
                                  form.setValue("proposalData", {
                                    ...currentData,
                                    methodology: e.target.value,
                                  });
                                }
                              }}
                              placeholder="Describe your approach to completing this project..."
                              rows={4}
                              data-testid="textarea-methodology"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {bidType === "hardware" && (
                  <>
                    <FormField
                      control={form.control}
                      name="proposalData.productSpecs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Specifications</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={form.watch("proposalData")?.type === "hardware" ? form.watch("proposalData.productSpecs") : ""}
                              onChange={(e) => {
                                const currentData = form.watch("proposalData");
                                if (currentData?.type === "hardware") {
                                  form.setValue("proposalData", {
                                    ...currentData,
                                    productSpecs: e.target.value,
                                  });
                                }
                              }}
                              placeholder="Detailed product specifications..."
                              rows={4}
                              data-testid="textarea-product-specs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="proposalData.manufacturer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufacturer</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={form.watch("proposalData")?.type === "hardware" ? form.watch("proposalData.manufacturer") : ""}
                                onChange={(e) => {
                                  const currentData = form.watch("proposalData");
                                  if (currentData?.type === "hardware") {
                                    form.setValue("proposalData", {
                                      ...currentData,
                                      manufacturer: e.target.value,
                                    });
                                  }
                                }}
                                placeholder="Product manufacturer"
                                data-testid="input-manufacturer"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="proposalData.warrantyPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warranty Period</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={form.watch("proposalData")?.type === "hardware" ? form.watch("proposalData.warrantyPeriod") : ""}
                                onChange={(e) => {
                                  const currentData = form.watch("proposalData");
                                  if (currentData?.type === "hardware") {
                                    form.setValue("proposalData", {
                                      ...currentData,
                                      warrantyPeriod: e.target.value,
                                    });
                                  }
                                }}
                                placeholder="e.g., 2 years"
                                data-testid="input-warranty"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormLabel>Certifications</FormLabel>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Add certification"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCertification(e.currentTarget.value);
                              e.currentTarget.value = "";
                            }
                          }}
                          data-testid="input-certification"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {certifications.map((cert, index) => (
                          <Badge key={index} variant="secondary" data-testid={`badge-cert-${index}`}>
                            {cert}
                            <X
                              className="h-3 w-3 ml-1 cursor-pointer"
                              onClick={() => setCertifications(certifications.filter((_, i) => i !== index))}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {bidType === "software" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="proposalData.licensingModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Licensing Model</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={form.watch("proposalData")?.type === "software" ? form.watch("proposalData.licensingModel") : ""}
                                onChange={(e) => {
                                  const currentData = form.watch("proposalData");
                                  if (currentData?.type === "software") {
                                    form.setValue("proposalData", {
                                      ...currentData,
                                      licensingModel: e.target.value,
                                    });
                                  }
                                }}
                                placeholder="e.g., Perpetual, Subscription"
                                data-testid="input-licensing"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="proposalData.userCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User Capacity</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                value={form.watch("proposalData")?.type === "software" ? form.watch("proposalData.userCapacity") : 0}
                                onChange={(e) => {
                                  const currentData = form.watch("proposalData");
                                  if (currentData?.type === "software") {
                                    form.setValue("proposalData", {
                                      ...currentData,
                                      userCapacity: parseInt(e.target.value) || 0,
                                    });
                                  }
                                }}
                                placeholder="Number of users"
                                data-testid="input-user-capacity"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="proposalData.supportLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Level</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={form.watch("proposalData")?.type === "software" ? form.watch("proposalData.supportLevel") : ""}
                              onChange={(e) => {
                                const currentData = form.watch("proposalData");
                                if (currentData?.type === "software") {
                                  form.setValue("proposalData", {
                                    ...currentData,
                                    supportLevel: e.target.value,
                                  });
                                }
                              }}
                              placeholder="e.g., 24/7, Business Hours"
                              data-testid="input-support-level"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proposalData.slaTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SLA Terms</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={form.watch("proposalData")?.type === "software" ? form.watch("proposalData.slaTerms") : ""}
                              onChange={(e) => {
                                const currentData = form.watch("proposalData");
                                if (currentData?.type === "software") {
                                  form.setValue("proposalData", {
                                    ...currentData,
                                    slaTerms: e.target.value,
                                  });
                                }
                              }}
                              placeholder="Service Level Agreement terms..."
                              rows={3}
                              data-testid="textarea-sla-terms"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pricing Breakdown
                    </CardTitle>
                    <CardDescription>
                      Optional: Provide a detailed breakdown of costs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pricingItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-5 gap-2 items-end">
                        <div className="col-span-2">
                          <Input
                            placeholder="Item description"
                            value={item.item}
                            onChange={(e) => {
                              const newItems = [...pricingItems];
                              newItems[index].item = e.target.value;
                              setPricingItems(newItems);
                            }}
                            data-testid={`input-pricing-item-${index}`}
                          />
                        </div>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...pricingItems];
                            newItems[index].quantity = parseInt(e.target.value) || 0;
                            setPricingItems(newItems);
                          }}
                          data-testid={`input-pricing-qty-${index}`}
                        />
                        <Input
                          placeholder="Unit price"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newItems = [...pricingItems];
                            newItems[index].unitPrice = e.target.value;
                            setPricingItems(newItems);
                          }}
                          data-testid={`input-pricing-unit-${index}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePricingItem(index)}
                          data-testid={`button-remove-pricing-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPricingItem}
                      data-testid="button-add-pricing-item"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Pricing Item
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="milestones" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Project Milestones</CardTitle>
                    <CardDescription>
                      Optional: Define key milestones and payment schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {milestones.map((milestone, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            placeholder="Milestone description"
                            value={milestone.description}
                            onChange={(e) => {
                              const newMilestones = [...milestones];
                              newMilestones[index].description = e.target.value;
                              setMilestones(newMilestones);
                            }}
                            data-testid={`input-milestone-desc-${index}`}
                          />
                        </div>
                        <Input
                          type="date"
                          value={milestone.dueDate}
                          onChange={(e) => {
                            const newMilestones = [...milestones];
                            newMilestones[index].dueDate = e.target.value;
                            setMilestones(newMilestones);
                          }}
                          data-testid={`input-milestone-date-${index}`}
                        />
                        <Input
                          placeholder="Payment amount"
                          value={milestone.payment}
                          onChange={(e) => {
                            const newMilestones = [...milestones];
                            newMilestones[index].payment = e.target.value;
                            setMilestones(newMilestones);
                          }}
                          data-testid={`input-milestone-payment-${index}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMilestone(index)}
                          data-testid={`button-remove-milestone-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMilestone}
                      data-testid="button-add-milestone"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitBidMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitBidMutation.isPending}
                data-testid="button-submit-bid"
              >
                {submitBidMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Bid
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
