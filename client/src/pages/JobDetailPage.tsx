import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation } from "wouter";
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Briefcase, 
  DollarSign, 
  Clock, 
  Calendar, 
  User, 
  Building2, 
  MapPin,
  CheckCircle,
  ArrowLeft,
  Send,
  Shield
} from "lucide-react";
import { BidSubmissionDialog } from "@/components/BidSubmissionDialog";
import { BookmarkButton } from "@/components/BookmarkButton";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState } from "react";
import { format } from "date-fns";
import type { Job as JobType } from "@shared/schema";

interface JobDetail {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  budgetType: string | null;
  categoryId: string;
  categoryPathLabel: string;
  status: string;
  skills: string[] | null;
  experienceLevel: string | null;
  createdAt: string;
  deadline: string | null;
  clientId: string;
  clientName?: string;
  clientCompany?: string;
  milestones?: Array<{
    name: string;
    description?: string;
    amount: number;
  }>;
  customFields?: Record<string, any>;
}

export default function JobDetailPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/jobs/:id");
  const { user, getSelectedRole } = useAuthContext();
  const [showBidDialog, setShowBidDialog] = useState(false);
  
  const jobId = params?.id;
  const isConsultant = getSelectedRole() === 'consultant';
  const isClient = getSelectedRole() === 'client';

  const { data: job, isLoading, error } = useQuery<JobDetail>({
    queryKey: ['/api/jobs', jobId],
    enabled: !!jobId,
  });

  const { data: existingBid } = useQuery<{ id: string } | null>({
    queryKey: ['/api/jobs', jobId, 'my-bid'],
    enabled: !!jobId && isConsultant,
  });

  if (!match || !jobId) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t("common.invalidUrl")}</p>
        </div>
      </UserLayout>
    );
  }

  if (isLoading) {
    return (
      <UserLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </UserLayout>
    );
  }

  if (error || !job) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">{t("jobs.notFound")}</p>
          <Button onClick={() => navigate("/browse-jobs")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("jobs.backToList")}
          </Button>
        </div>
      </UserLayout>
    );
  }

  const hasBid = !!existingBid;
  const canBid = isConsultant && job.status === 'open' && !hasBid;

  const formatBudget = (budget: string | null, budgetType: string | null) => {
    if (!budget) return t("jobs.budgetNegotiable");
    const amount = parseFloat(budget).toLocaleString();
    const type = budgetType === 'fixed' ? t("jobs.fixed") : t("jobs.hourly");
    return `${amount} SAR (${type})`;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'open': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'closed': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || colors['open'];
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/browse-jobs")}
            data-testid="button-back-to-jobs"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("jobs.backToList")}
          </Button>
          
          {isConsultant && (
            <BookmarkButton 
              jobId={job.id} 
              data-testid="button-bookmark-job"
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl" data-testid="text-job-title">
                      {job.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span data-testid="text-job-category">{job.categoryPathLabel}</span>
                    </CardDescription>
                  </div>
                  <Badge 
                    className={getStatusBadge(job.status)}
                    data-testid="badge-job-status"
                  >
                    {t(`jobs.status.${job.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">{t("jobs.description")}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-job-description">
                    {job.description}
                  </p>
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">{t("jobs.requiredSkills")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" data-testid={`badge-skill-${index}`}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {job.milestones && job.milestones.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">{t("jobs.milestones")}</h3>
                    <div className="space-y-3">
                      {job.milestones.map((milestone, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 rounded-md border"
                          data-testid={`milestone-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{milestone.name}</p>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground">{milestone.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="font-semibold text-primary">
                            {milestone.amount.toLocaleString()} SAR
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("jobs.details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("jobs.budget")}</p>
                    <p className="font-semibold" data-testid="text-job-budget">
                      {formatBudget(job.budget, job.budgetType)}
                    </p>
                  </div>
                </div>

                {job.experienceLevel && (
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("jobs.experienceLevel")}</p>
                      <p className="font-semibold" data-testid="text-job-experience">
                        {t(`jobs.experience.${job.experienceLevel}`)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("jobs.posted")}</p>
                    <p className="font-semibold" data-testid="text-job-posted-date">
                      {format(new Date(job.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {job.deadline && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("jobs.deadline")}</p>
                      <p className="font-semibold" data-testid="text-job-deadline">
                        {format(new Date(job.deadline), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>

              {isConsultant && (
                <CardFooter className="flex flex-col gap-3">
                  {hasBid ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span>{t("jobs.bidSubmitted")}</span>
                    </div>
                  ) : canBid ? (
                    <Button 
                      className="w-full" 
                      onClick={() => setShowBidDialog(true)}
                      data-testid="button-submit-bid"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {t("jobs.submitBid")}
                    </Button>
                  ) : job.status !== 'open' ? (
                    <p className="text-sm text-muted-foreground text-center">
                      {t("jobs.notAcceptingBids")}
                    </p>
                  ) : null}
                </CardFooter>
              )}
            </Card>

            {(job.clientName || job.clientCompany) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("jobs.client")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {job.clientCompany && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("jobs.company")}</p>
                        <p className="font-semibold" data-testid="text-client-company">
                          {job.clientCompany}
                        </p>
                      </div>
                    </div>
                  )}
                  {job.clientName && (
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("jobs.postedBy")}</p>
                        <p className="font-semibold" data-testid="text-client-name">
                          {job.clientName}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showBidDialog && (
        <BidSubmissionDialog
          job={job as unknown as JobType}
          open={showBidDialog}
          onClose={() => setShowBidDialog(false)}
        />
      )}
    </UserLayout>
  );
}
