import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { PublicProfileSheet } from '@/components/profile/PublicProfileSheet';

interface PublicProfileContextValue {
  openProfile: (profileId: string) => void;
  closeProfile: () => void;
}

const PublicProfileContext = createContext<PublicProfileContextValue | undefined>(undefined);

export function PublicProfileProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileId] = useState<string | null>(null);

  const openProfile = useCallback((id: string) => {
    if (!id) return;
    setProfileId(id);
  }, []);

  const closeProfile = useCallback(() => setProfileId(null), []);

  return (
    <PublicProfileContext.Provider value={{ openProfile, closeProfile }}>
      {children}
      <PublicProfileSheet
        profileId={profileId}
        open={!!profileId}
        onOpenChange={(open) => !open && closeProfile()}
      />
    </PublicProfileContext.Provider>
  );
}

export function usePublicProfile() {
  const ctx = useContext(PublicProfileContext);
  if (!ctx) {
    // Fallback no-op so components can call openProfile even if provider is missing
    return {
      openProfile: () => {
        if (import.meta.env.DEV) {
          console.warn('[PublicProfile] openProfile called outside provider');
        }
      },
      closeProfile: () => {},
    };
  }
  return ctx;
}
