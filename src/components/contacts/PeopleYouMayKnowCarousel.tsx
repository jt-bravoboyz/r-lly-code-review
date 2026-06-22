import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Check } from 'lucide-react';
import { useRequestFriend, useFriendships, getFriendshipState } from '@/hooks/useFriendships';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { ProfileTapWrapper } from '@/components/profile/ProfileTapWrapper';
import { toast } from 'sonner';

interface PymkRow {
  profile_id: string;
  display_name: string | null;
  avatar_url: string | null;
  mutual_count: number;
  mutual_sample_names: (string | null)[];
}

function captionFor(row: PymkRow) {
  const names = (row.mutual_sample_names || []).filter(Boolean) as string[];
  if (!names.length) return null;
  const first = names[0];
  const extra = Math.max(row.mutual_count - 1, 0);
  if (extra <= 0) return `Friends with ${first}`;
  return `Friends with ${first} and ${extra} other${extra === 1 ? '' : 's'}`;
}

export function PeopleYouMayKnowCarousel() {
  const { profile } = useAuth();
  const { data: friendships = [] } = useFriendships();
  const { data: rallyFriends = [] } = useRallyFriends();
  const requestFriend = useRequestFriend();
  const [optimisticSent, setOptimisticSent] = useState<Set<string>>(new Set());

  const { data = [], isLoading } = useQuery({
    queryKey: ['pymk', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [] as PymkRow[];
      const { data, error } = await (supabase as any).rpc('get_people_you_may_know', { p_limit: 20 });
      if (error) throw error;
      return (data || []) as PymkRow[];
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5,
  });

  const excludedProfileIds = useMemo(() => {
    const ids = new Set<string>();
    if (!profile?.id) return ids;
    for (const friend of rallyFriends) {
      if (friend?.id) ids.add(friend.id);
    }
    return ids;
  }, [rallyFriends, profile?.id]);

  const filteredData = useMemo(
    () => data.filter((row) => row.profile_id !== profile?.id && !excludedProfileIds.has(row.profile_id)),
    [data, excludedProfileIds, profile?.id]
  );

  if (isLoading || !filteredData.length) return null;

  return (
    <section className="space-y-2 -mx-4 sm:mx-0">
      <div className="px-5 sm:px-1 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F47A19] shadow-[0_0_10px_#F47A19]" />
        <p className="text-[10px] font-black font-montserrat text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.2em]">
          People You May Know
        </p>
      </div>
      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-none">
        <div className="flex gap-3 px-4 sm:px-0 pb-1">
          {filteredData.map((row) => {
            const state = getFriendshipState(row.profile_id, friendships, profile?.id);
            const sent = state.state === 'pending_outgoing' || optimisticSent.has(row.profile_id);
            const friends = state.state === 'accepted';
            const disabled = sent || friends || requestFriend.isPending;
            const caption = captionFor(row);
            return (
              <div
                key={row.profile_id}
                className="snap-start shrink-0 w-[170px] rounded-2xl p-3 bg-white/80 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] backdrop-blur-xl shadow-[0_4px_18px_-8px_rgba(0,0,0,0.15)] flex flex-col items-center text-center gap-2"
              >
                <ProfileTapWrapper profileId={row.profile_id} className="flex flex-col items-center gap-2 w-full min-w-0">
                  <Avatar className="h-14 w-14 ring-1 ring-[#F47A19]/30">
                    <AvatarImage src={row.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#F47A19]/15 text-[#F47A19] font-black">
                      {row.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate w-full">
                    {row.display_name || 'R@lly Member'}
                  </p>
                  {caption && (
                    <p className="text-[10px] text-zinc-500 leading-tight line-clamp-2">{caption}</p>
                  )}
                </ProfileTapWrapper>
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={async () => {
                    setOptimisticSent((prev) => {
                      const next = new Set(prev);
                      next.add(row.profile_id);
                      return next;
                    });
                    try {
                      await requestFriend.mutateAsync(row.profile_id);
                      toast.success('Request sent');
                    } catch (e: any) {
                      setOptimisticSent((prev) => {
                        const next = new Set(prev);
                        next.delete(row.profile_id);
                        return next;
                      });
                      toast.error(e?.message || 'Could not send request');
                    }
                  }}
                  className={
                    sent || friends
                      ? 'h-9 min-h-[36px] w-full rounded-full text-[11px] font-black uppercase tracking-wider bg-[#F47A19]/12 text-[#F47A19] border border-[#F47A19]/30 transition-all'
                      : 'h-9 min-h-[36px] w-full rounded-full text-[11px] font-black uppercase tracking-wider bg-[#F47A19] text-white hover:bg-[#F47A19]/90 shadow-lg shadow-[#F47A19]/30 transition-all'
                  }
                >
                  {friends ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Friends
                    </>
                  ) : sent ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Requested
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
