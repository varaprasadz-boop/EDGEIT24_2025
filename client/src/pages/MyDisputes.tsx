import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, FileText } from "lucide-react";
import { format } from "date-fns";

type Dispute = {
  id: string;
  projectId: string;
  disputeType: string;
  title: string;
  status: string;
  createdAt: string;
};

const disputeTypeLabels: Record<string, string> = {
  payment_dispute: "Payment Dispute",
  quality_dispute: "Quality Dispute",
  delivery_dispute: "Delivery Dispute",
  refund_request: "Refund Request",
  contract_violation: "Contract Violation",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  under_review: "bg-blue-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

export default function MyDisputes() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/disputes'],
    queryFn: async () => {
      const res = await fetch('/api/disputes', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch disputes');
      return res.json();
    },
  });

  const disputes = data?.disputes || [];

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold" data-testid="title-my-disputes">My Disputes</h1>
        </div>
        <Link href="/raise-dispute">
          <Button data-testid="button-raise-dispute">
            <Plus className="h-4 w-4 mr-2" />
            Raise Dispute
          </Button>
        </Link>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading your disputes...
          </CardContent>
        </Card>
      )}

      {!isLoading && disputes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4" data-testid="text-no-disputes">
              You haven't raised any disputes yet.
            </p>
            <Link href="/raise-dispute">
              <Button variant="outline" data-testid="button-raise-first-dispute">
                <Plus className="h-4 w-4 mr-2" />
                Raise Your First Dispute
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && disputes.length > 0 && (
        <div className="grid gap-4">
          {disputes.map((dispute: Dispute) => (
            <Card key={dispute.id} data-testid={`card-dispute-${dispute.id}`} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2" data-testid={`text-title-${dispute.id}`}>
                      {dispute.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" data-testid={`badge-type-${dispute.id}`}>
                        {disputeTypeLabels[dispute.disputeType] || dispute.disputeType}
                      </Badge>
                      <Badge 
                        className={statusColors[dispute.status]} 
                        data-testid={`badge-status-${dispute.id}`}
                      >
                        {dispute.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p data-testid={`text-date-${dispute.id}`}>
                      {format(new Date(dispute.createdAt), 'MMM d, yyyy')}
                    </p>
                    <Link href={`/disputes/${dispute.id}`}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        data-testid={`button-view-${dispute.id}`}
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
