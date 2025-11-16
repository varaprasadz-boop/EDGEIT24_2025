import { format } from "date-fns";
import { Calendar, Clock, Video, Check, X, CircleDashed, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type MeetingLink = {
  id: string;
  conversationId: string;
  createdBy: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  duration: number | null;
  meetingType: string;
  meetingUrl: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type MeetingParticipant = {
  id: string;
  meetingId: string;
  userId: string;
  responseStatus: string;
};

interface MeetingCardProps {
  meeting: MeetingLink;
  currentUserId: string;
  participants?: MeetingParticipant[];
  onRsvp?: (meetingId: string, status: "accepted" | "declined" | "tentative") => Promise<void>;
}

export function MeetingCard({
  meeting,
  currentUserId,
  participants = [],
  onRsvp,
}: MeetingCardProps) {
  const currentUserParticipant = participants.find(
    (p) => p.userId === currentUserId
  );
  const currentUserStatus = currentUserParticipant?.responseStatus || "pending";

  const isPast = new Date(meeting.scheduledAt) < new Date();
  const isCreator = meeting.createdBy === currentUserId;

  const getMeetingTypeIcon = () => {
    switch (meeting.meetingType) {
      case "google_meet":
        return <Video className="h-4 w-4" />;
      case "zoom":
        return <Video className="h-4 w-4" />;
      case "teams":
        return <Video className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const getMeetingTypeName = () => {
    switch (meeting.meetingType) {
      case "google_meet":
        return "Google Meet";
      case "zoom":
        return "Zoom";
      case "teams":
        return "Microsoft Teams";
      default:
        return "Meeting";
    }
  };

  const getStatusBadge = () => {
    if (meeting.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (isPast) {
      return <Badge variant="secondary">Past</Badge>;
    }
    return <Badge variant="default">Scheduled</Badge>;
  };

  const getRsvpBadge = () => {
    switch (currentUserStatus) {
      case "accepted":
        return (
          <Badge variant="default" className="bg-green-600">
            <Check className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      case "tentative":
        return (
          <Badge variant="secondary">
            <CircleDashed className="h-3 w-3 mr-1" />
            Tentative
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <CircleDashed className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const acceptedCount = participants.filter(
    (p) => p.responseStatus === "accepted"
  ).length;
  const declinedCount = participants.filter(
    (p) => p.responseStatus === "declined"
  ).length;

  return (
    <Card className="hover-elevate" data-testid={`meeting-card-${meeting.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            {getMeetingTypeIcon()}
            <div className="flex-1">
              <h3 className="font-semibold text-sm" data-testid="meeting-title">
                {meeting.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {getMeetingTypeName()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {getStatusBadge()}
            {getRsvpBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {meeting.description && (
          <p className="text-sm text-muted-foreground">{meeting.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span data-testid="meeting-date">
              {format(new Date(meeting.scheduledAt), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span data-testid="meeting-time">
              {format(new Date(meeting.scheduledAt), "h:mm a")}
            </span>
            {meeting.duration && <span>({meeting.duration} min)</span>}
          </div>
        </div>

        {participants.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{participants.length} invited</span>
            {acceptedCount > 0 && (
              <span className="text-green-600">{acceptedCount} accepted</span>
            )}
            {declinedCount > 0 && (
              <span className="text-destructive">{declinedCount} declined</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            asChild
            data-testid="button-join-meeting"
          >
            <a
              href={meeting.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Join Meeting
            </a>
          </Button>

          {!isPast && meeting.status !== "cancelled" && onRsvp && (
            <>
              {currentUserStatus !== "accepted" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onRsvp(meeting.id, "accepted")}
                  data-testid="button-accept-meeting"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Accept
                </Button>
              )}
              {currentUserStatus !== "declined" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onRsvp(meeting.id, "declined")}
                  data-testid="button-decline-meeting"
                >
                  <X className="h-3 w-3 mr-1" />
                  Decline
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
