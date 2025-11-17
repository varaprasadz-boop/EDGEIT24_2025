import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, DollarSign, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';

interface SuggestedConsultantsSectionProps {
  projectId: string;
  limit?: number;
}

export function SuggestedConsultantsSection({ projectId, limit = 5 }: SuggestedConsultantsSectionProps) {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'suggested-consultants'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/suggested-consultants?limit=${limit}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch suggested consultants');
      return res.json();
    },
  });

  const consultants = data?.consultants || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Suggested Consultants</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-powered recommendations based on your project requirements
          </p>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (consultants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Suggested Consultants</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No matching consultants found for this project. Try browsing all consultants.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/client/find-consultants')}
            className="mt-4"
          >
            Browse Consultants
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="suggested-consultants-section">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Suggested Consultants</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Top {consultants.length} matches based on category, skills, and success rate
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/client/find-consultants')}
            data-testid="button-view-all-consultants"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {consultants.map((consultant: any) => (
          <div
            key={consultant.id}
            className="p-4 border rounded-md hover-elevate transition-all"
            data-testid={`suggested-consultant-${consultant.id}`}
          >
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={consultant.profilePicture || undefined} alt={consultant.name} />
                <AvatarFallback>
                  {consultant.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{consultant.name}</h4>
                      {consultant.verified && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    {consultant.category && (
                      <p className="text-sm text-muted-foreground">{consultant.category}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm">
                  {consultant.rating !== null && consultant.rating !== undefined && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{consultant.rating.toFixed(1)}</span>
                      {consultant.reviewCount && (
                        <span className="text-muted-foreground">({consultant.reviewCount})</span>
                      )}
                    </div>
                  )}
                  {consultant.pricing && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span>SAR {consultant.pricing}/hr</span>
                    </div>
                  )}
                  {consultant.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{consultant.location}</span>
                    </div>
                  )}
                </div>

                {consultant.skills && consultant.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {consultant.skills.slice(0, 4).map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {consultant.skills.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{consultant.skills.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/client/consultants/${consultant.userId}`)}
                    data-testid={`button-view-profile-${consultant.id}`}
                  >
                    View Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-invite-consultant-${consultant.id}`}
                  >
                    Invite to Bid
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
