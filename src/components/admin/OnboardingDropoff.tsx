import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { AdminEmptyState } from './AdminEmptyState';

const ONBOARDING_STEPS = [
  { key: 'signup', label: 'Sign Up' },
  { key: 'profile_created', label: 'Profile Created' },
  { key: 'event_created', label: 'First Event Created' },
  { key: 'event_joined', label: 'First Event Joined' },
];

export function OnboardingDropoff() {
  const { data: steps } = useQuery({
    queryKey: ['admin-onboarding-dropoff'],
    queryFn: async () => {
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_name, user_id')
        .in('event_name', ['signup', 'profile_created', 'event_created', 'event_joined'])
        .range(0, 9999);

      const allEvents = events || [];

      // Also count profiles as implicit "signup" if no explicit signup event
      const { count: profileCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      return ONBOARDING_STEPS.map(step => {
        if (step.key === 'signup') {
          const signupUsers = new Set(allEvents.filter(e => e.event_name === 'signup').map(e => e.user_id));
          return { ...step, count: Math.max(signupUsers.size, profileCount || 0) };
        }
        if (step.key === 'profile_created') {
          return { ...step, count: profileCount || 0 };
        }
        const unique = new Set(allEvents.filter(e => e.event_name === step.key).map(e => e.user_id));
        return { ...step, count: unique.size };
      });
    },
    refetchInterval: 30000,
  });

  const maxCount = steps ? Math.max(...steps.map(s => s.count), 1) : 1;
  const hasData = steps && steps.some(s => s.count > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4 text-primary" />
          Onboarding Drop-off
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <AdminEmptyState icon={<UserPlus className="h-10 w-10 opacity-30" />} message="No onboarding data yet" />
        ) : (
          <div className="space-y-3">
            {steps?.map((step, i) => {
              const pct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
              const prevCount = i > 0 ? steps[i - 1].count : step.count;
              const dropoff = prevCount > 0 ? Math.round(((prevCount - step.count) / prevCount) * 100) : 0;

              return (
                <div key={step.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{step.label}</span>
                    <span className="text-muted-foreground">
                      {step.count} users
                      {i > 0 && dropoff > 0 && (
                        <span className="text-destructive ml-1">(-{dropoff}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
