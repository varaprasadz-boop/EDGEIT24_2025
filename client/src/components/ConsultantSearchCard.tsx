import { useState } from 'react';
import { Star, MapPin, DollarSign, CheckCircle, MessageSquare, Bookmark, UserPlus } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocation } from 'wouter';

interface ConsultantSearchCardProps {
  consultant: {
    id: string;
    userId: string;
    name?: string | null;
    profilePicture?: string | null;
    category?: string | null;
    subcategory?: string | null;
    skills?: string[] | null;
    location?: string | null;
    pricing?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    availability?: boolean | null;
    verified?: boolean | null;
    successRate?: number | null;
    bio?: string | null;
    languages?: string[] | null;
    certifications?: string[] | null;
  };
  onSaveToList?: (consultantId: string) => void;
  onInviteToBid?: (consultantId: string) => void;
  onSendMessage?: (consultantId: string) => void;
}

export function ConsultantSearchCard({ consultant, onSaveToList, onInviteToBid, onSendMessage }: ConsultantSearchCardProps) {
  const [, navigate] = useLocation();
  const [isSaved, setIsSaved] = useState(false);

  const initials = consultant.name
    ? consultant.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'C';

  const excerpt = consultant.bio
    ? consultant.bio.substring(0, 120) + (consultant.bio.length > 120 ? '...' : '')
    : 'No bio available';

  const handleSaveToList = () => {
    setIsSaved(!isSaved);
    onSaveToList?.(consultant.userId);
  };

  return (
    <Card className="hover-elevate transition-all" data-testid={`consultant-card-${consultant.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16" data-testid={`consultant-avatar-${consultant.id}`}>
            <AvatarImage src={consultant.profilePicture || undefined} alt={consultant.name || 'Consultant'} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/client/consultants/${consultant.userId}`)}
                    data-testid={`consultant-name-${consultant.id}`}
                  >
                    {consultant.name || 'Unnamed Consultant'}
                  </h3>
                  {consultant.verified && (
                    <CheckCircle className="h-4 w-4 text-primary" data-testid={`consultant-verified-${consultant.id}`} />
                  )}
                </div>
                {consultant.category && (
                  <p className="text-sm text-muted-foreground" data-testid={`consultant-category-${consultant.id}`}>
                    {consultant.category}
                    {consultant.subcategory && ` • ${consultant.subcategory}`}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleSaveToList}
                className={isSaved ? 'text-primary' : ''}
                data-testid={`button-save-consultant-${consultant.id}`}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm">
              {consultant.rating !== null && consultant.rating !== undefined && (
                <div className="flex items-center gap-1" data-testid={`consultant-rating-${consultant.id}`}>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{consultant.rating.toFixed(1)}</span>
                  {consultant.reviewCount !== null && consultant.reviewCount !== undefined && (
                    <span className="text-muted-foreground">({consultant.reviewCount})</span>
                  )}
                </div>
              )}
              {consultant.successRate !== null && consultant.successRate !== undefined && (
                <div className="flex items-center gap-1" data-testid={`consultant-success-rate-${consultant.id}`}>
                  <span className="font-medium">{consultant.successRate}%</span>
                  <span className="text-muted-foreground">success</span>
                </div>
              )}
              {consultant.availability && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Available
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground" data-testid={`consultant-bio-${consultant.id}`}>
          {excerpt}
        </p>

        {consultant.skills && consultant.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {consultant.skills.slice(0, 6).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs" data-testid={`consultant-skill-${consultant.id}-${index}`}>
                {skill}
              </Badge>
            ))}
            {consultant.skills.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{consultant.skills.length - 6} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm">
          {consultant.pricing && (
            <div className="flex items-center gap-1" data-testid={`consultant-pricing-${consultant.id}`}>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">SAR {consultant.pricing}/hr</span>
            </div>
          )}
          {consultant.location && (
            <div className="flex items-center gap-1" data-testid={`consultant-location-${consultant.id}`}>
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{consultant.location}</span>
            </div>
          )}
        </div>

        {consultant.languages && consultant.languages.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Languages:</span>
            <span>{consultant.languages.join(', ')}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t flex-wrap">
        <Button
          variant="default"
          onClick={() => navigate(`/client/consultants/${consultant.userId}`)}
          data-testid={`button-view-profile-${consultant.id}`}
        >
          View Profile
        </Button>
        <Button
          variant="outline"
          onClick={() => onInviteToBid?.(consultant.userId)}
          data-testid={`button-invite-bid-${consultant.id}`}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite to Bid
        </Button>
        <Button
          variant="ghost"
          onClick={() => onSendMessage?.(consultant.userId)}
          data-testid={`button-send-message-${consultant.id}`}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Message
        </Button>
      </CardFooter>
    </Card>
  );
}
