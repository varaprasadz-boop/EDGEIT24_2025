import { useQuery } from '@tanstack/react-query';
import { useSearch, useLocation } from 'wouter';
import { UserLayout } from '@/components/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, DollarSign, CheckCircle, Briefcase, Award, Languages, Loader2 } from 'lucide-react';

export default function CompareConsultantsPage() {
  const searchParams = new URLSearchParams(useSearch());
  const consultantIds = searchParams.get('ids')?.split(',') || [];
  const [, navigate] = useLocation();

  const { data: consultantsData, isLoading } = useQuery({
    queryKey: ['/api/consultants/compare', consultantIds.join(',')],
    enabled: consultantIds.length > 0,
  });

  const consultants = (consultantsData as any)?.consultants || [];

  if (consultantIds.length === 0) {
    return (
      <UserLayout>
        <div className="container mx-auto py-6 px-4">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              No consultants selected for comparison. Please select consultants from the search page.
            </p>
            <Button onClick={() => navigate('/client/find-consultants')} className="mt-4">
              Find Consultants
            </Button>
          </Card>
        </div>
      </UserLayout>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Compare Consultants</h1>
        <p className="text-muted-foreground">
          Side-by-side comparison of {consultants.length} consultants
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" data-testid="comparison-table">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 font-medium bg-muted/50 sticky left-0 z-10">Criteria</th>
              {consultants.map((consultant: any) => (
                <th key={consultant.id} className="p-4 min-w-[250px]" data-testid={`consultant-column-${consultant.id}`}>
                  <div className="flex flex-col items-center text-center gap-2">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={consultant.profilePicture || undefined} alt={consultant.name} />
                      <AvatarFallback>
                        {consultant.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold flex items-center gap-1 justify-center">
                        {consultant.name}
                        {consultant.verified && <CheckCircle className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="text-sm text-muted-foreground">{consultant.category}</div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ComparisonRow
              label="Rating"
              icon={<Star className="h-4 w-4" />}
              values={consultants.map((c: any) => (
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{c.rating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-muted-foreground text-sm">
                    ({c.reviewCount || 0})
                  </span>
                </div>
              ))}
            />
            <ComparisonRow
              label="Pricing"
              icon={<DollarSign className="h-4 w-4" />}
              values={consultants.map((c: any) => (
                <div className="font-medium">
                  {c.pricing ? `SAR ${c.pricing}/hr` : 'Not specified'}
                </div>
              ))}
            />
            <ComparisonRow
              label="Success Rate"
              icon={<Award className="h-4 w-4" />}
              values={consultants.map((c: any) => (
                <div className="font-medium">
                  {c.successRate !== null && c.successRate !== undefined ? `${c.successRate}%` : 'N/A'}
                </div>
              ))}
            />
            <ComparisonRow
              label="Location"
              icon={<MapPin className="h-4 w-4" />}
              values={consultants.map((c: any) => c.location || 'Not specified')}
            />
            <ComparisonRow
              label="Experience"
              icon={<Briefcase className="h-4 w-4" />}
              values={consultants.map((c: any) => (
                <div>{c.yearsOfExperience ? `${c.yearsOfExperience} years` : 'Not specified'}</div>
              ))}
            />
            <ComparisonRow
              label="Languages"
              icon={<Languages className="h-4 w-4" />}
              values={consultants.map((c: any) => (
                <div className="text-sm">
                  {c.languages && c.languages.length > 0 ? c.languages.join(', ') : 'Not specified'}
                </div>
              ))}
            />
            <ComparisonRow
              label="Availability"
              icon={<CheckCircle className="h-4 w-4" />}
              values={consultants.map((c: any) => (
                c.availability ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not available</Badge>
                )
              ))}
            />
            <ComparisonRow
              label="Skills"
              values={consultants.map((c: any) => (
                <div className="flex flex-wrap gap-1 justify-center">
                  {c.skills && c.skills.length > 0 ? (
                    c.skills.slice(0, 5).map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No skills listed</span>
                  )}
                  {c.skills && c.skills.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{c.skills.length - 5} more
                    </Badge>
                  )}
                </div>
              ))}
            />
            <ComparisonRow
              label="Actions"
              values={consultants.map((c: any) => (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/client/consultants/${c.userId}`)}
                    data-testid={`button-view-profile-${c.id}`}
                  >
                    View Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-invite-${c.id}`}
                  >
                    Invite to Bid
                  </Button>
                </div>
              ))}
            />
          </tbody>
        </table>
      </div>
      </div>
    </UserLayout>
  );
}

interface ComparisonRowProps {
  label: string;
  icon?: React.ReactNode;
  values: React.ReactNode[];
}

function ComparisonRow({ label, icon, values }: ComparisonRowProps) {
  return (
    <tr className="border-b hover-elevate">
      <td className="p-4 font-medium bg-muted/50 sticky left-0 z-10">
        <div className="flex items-center gap-2">
          {icon}
          {label}
        </div>
      </td>
      {values.map((value, idx) => (
        <td key={idx} className="p-4 text-center">
          {value}
        </td>
      ))}
    </tr>
  );
}
