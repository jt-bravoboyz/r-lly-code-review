import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare } from 'lucide-react';

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
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="p-3 bg-muted rounded-lg text-center flex-1">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                {avgRating.toFixed(1)} <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-xs text-muted-foreground">Avg Rating ({feedback.length} reviews)</div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center flex-1">
              <div className="text-2xl font-bold">{founderFeedback.length}</div>
              <div className="text-xs text-muted-foreground">Founder Reviews</div>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {feedback.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No feedback yet</p>
            )}
            {feedback.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(f => {
              const profile = profiles.find(p => p.user_id === f.user_id);
              return (
                <div key={f.id} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {profile?.display_name || 'Anonymous'}
                      {profile?.founding_member && (
                        <span className="ml-1 text-yellow-500 text-xs">★ Founder</span>
                      )}
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < f.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {f.feedback_text && (
                    <p className="text-sm text-muted-foreground">{f.feedback_text}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }
);
