import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True after the very first auth resolution (success or failure) in this React tree's lifetime. */
  hasResolvedOnce: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string, phone?: string, referredBy?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasResolvedOnce, setHasResolvedOnce] = useState(false);


  // Prevent race conditions when users switch accounts quickly.
  const currentUserIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      // Verify the session user is actually hydrated before querying
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (!sessionUser || sessionUser.id !== userId) {
        // Session not ready yet — retry for new OAuth users
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 800);
          return;
        }
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (currentUserIdRef.current !== userId) return;

      if (error) {
        console.error('Failed to fetch profile:', error);
        setProfile(null);
        return;
      }

      if (!data || data.user_id !== userId) {
        // Profile may not exist yet for brand-new OAuth users (trigger delay)
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
          return;
        }
        setProfile(null);
        return;
      }

      setProfile(data);

      // Post-OAuth referral check
      const referrerId = localStorage.getItem('rally-referrer-id');
      if (
        referrerId &&
        !data.referred_by &&
        data.created_at &&
        new Date(data.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ) {
        try {
          await supabase.rpc('set_referral' as any, {
            p_user_id: userId,
            p_referrer_id: referrerId,
          });
          localStorage.removeItem('rally-referrer-id');
        } catch (refErr) {
          console.error('Post-OAuth referral attribution failed:', refErr);
        }
      }

      // Post-OAuth founding member claim
      const isFounding25 = localStorage.getItem('rally-founding25');
      if (
        isFounding25 === 'true' &&
        !data.founding_member &&
        data.created_at &&
        new Date(data.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ) {
        try {
          const { data: claimResult } = await supabase.rpc('claim_founding_spot' as any, {
            p_user_id: userId,
          });
          if (claimResult === true) {
            // Re-fetch profile to get founder state before clearing flag
            const { data: refreshed } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
            if (refreshed && currentUserIdRef.current === userId) {
              setProfile(refreshed);
              localStorage.removeItem('rally-founding25');
            }
          }
        } catch (err) {
          console.error('Post-OAuth founding claim failed:', err);
        }
      }
      
      // Clear founding flag only once profile confirms founder status
      if (data.founding_member && localStorage.getItem('rally-founding25') === 'true') {
        localStorage.removeItem('rally-founding25');
      }

      // Auto-award Founder 25 activity badge if founding member
      if (data.founding_member) {
        try {
          await supabase
            .from('rly_user_activity_badges' as any)
            .upsert({
              user_id: userId,
              badge_key: 'founder_25',
              progress_count: 1,
              earned_at: new Date().toISOString(),
              current_tier_level: 1,
            }, { onConflict: 'user_id,badge_key' });
        } catch (badgeErr) {
          console.error('Failed to award Founder 25 badge:', badgeErr);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
      if (currentUserIdRef.current === userId) setProfile(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Clear stale profile immediately; fetch the correct one for this user.
          setProfile(null);
          currentUserIdRef.current = session.user.id;
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          currentUserIdRef.current = null;
          setProfile(null);
        }
        setLoading(false);
        setHasResolvedOnce(true);

      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfile(null);
        currentUserIdRef.current = session.user.id;
        fetchProfile(session.user.id);
      } else {
        currentUserIdRef.current = null;
        setProfile(null);
      }
      setLoading(false);
      setHasResolvedOnce(true);

    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName: string, phone?: string, referredBy?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const isFoundingMember = localStorage.getItem('rally-founding25') === 'true';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { 
          display_name: displayName,
          phone: phone || null,
          referred_by: referredBy || null,
          ...(isFoundingMember ? { founding_member: 'true' } : {}),
        }
      }
    });
    
    if (!error) {
      localStorage.setItem('rally-is-new-signup', 'true');
      // Do NOT remove rally-founding25 here — let fetchProfile confirm
      // the DB flag before clearing, to prevent stale state if the
      // trigger hasn't fired yet.
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}