import { forwardRef } from 'react';
import { useLocationContext } from '@/contexts/LocationContext';
import { FindFriendView } from './FindFriendView';

export const NavigationPortal = forwardRef<HTMLDivElement>(function NavigationPortal(_, ref) {
  const { selectedMemberForNav, setSelectedMemberForNav } = useLocationContext();

  if (!selectedMemberForNav) return null;

  return (
    <div ref={ref}>
      <FindFriendView
        member={selectedMemberForNav}
        onClose={() => setSelectedMemberForNav(null)}
      />
    </div>
  );
});