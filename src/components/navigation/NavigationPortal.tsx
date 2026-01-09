import { useLocationContext } from '@/contexts/LocationContext';
import { FindFriendView } from './FindFriendView';

export function NavigationPortal() {
  const { selectedMemberForNav, setSelectedMemberForNav } = useLocationContext();

  if (!selectedMemberForNav) return null;

  return (
    <FindFriendView
      member={selectedMemberForNav}
      onClose={() => setSelectedMemberForNav(null)}
    />
  );
}