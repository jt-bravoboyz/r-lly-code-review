import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus } from 'lucide-react';
import { AdminEmptyState } from './AdminEmptyState';
import { BentoCard } from './BentoCard';
import { cn } from '@/lib/utils';

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
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Onboarding Drop-off
        </span>
      </div>
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
                  <span className="text-muted-foreground tabular-nums">
                    {step.count} users
                    {i > 0 && dropoff > 0 && (
                      <span className="text-red-500 ml-1">(-{dropoff}%)</span>
                    )}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden border border-border/30">
                  <div
                    className={cn('h-full rounded-full transition-all bg-gradient-to-r from-primary to-primary/70')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BentoCard>
  );
}
