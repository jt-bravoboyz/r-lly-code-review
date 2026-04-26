import React from 'react';
import { getPrivateName } from '@/lib/identity';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';

interface FeedbackPanelProps {
  feedback: Array<{
    id: string;
    event_id: string;
    user_id: string;
    rating: number;
    feedback_text: string | null;
    created_at: string;
  }>;
  profiles: Array<{
    id: string;
    user_id: string;
    display_name: string | null;
    avatar_url?: string | null;
    founding_member: boolean | null;
  }>;
}

export const FeedbackPanel = React.forwardRef<HTMLDivElement, FeedbackPanelProps>(
  function FeedbackPanel({ feedback, profiles }, ref) {
    const avgRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

    const founderFeedback = feedback.filter(f => {
      const profile = profiles.find(p => p.user_id === f.user_id);
      return profile?.founding_member;
    });

    return (
      <div ref={ref}>
        <BentoCard span={12}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Feedback
            </span>
            <MetricPill tone="muted" className="ml-auto">
              <span className="tabular-nums">{avgRating.toFixed(1)}</span>
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            </MetricPill>
            <MetricPill tone="muted">
              <span className="tabular-nums">{feedback.length}</span> reviews
            </MetricPill>
            {founderFeedback.length > 0 && (
              <MetricPill tone="accent">
                <span className="tabular-nums">{founderFeedback.length}</span> founder
              </MetricPill>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 -mr-1">
            {feedback.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No feedback yet</p>
            )}
            {feedback
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(f => {
                const profile = profiles.find(p => p.user_id === f.user_id);
                return (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl border border-border/30 bg-background/40 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(getPrivateName(profile as any) || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">
                          {getPrivateName(profile as any)}
                          {profile?.founding_member && (
                            <span className="ml-1 text-amber-500 text-xs">★</span>
                          )}
                        </span>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < f.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'}`}
                          />
                        ))}
                      </div>
                    </div>
                    {f.feedback_text && (
                      <p className="text-sm text-muted-foreground">{f.feedback_text}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(f.created_at).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
          </div>
        </BentoCard>
      </div>
    );
  }
);
