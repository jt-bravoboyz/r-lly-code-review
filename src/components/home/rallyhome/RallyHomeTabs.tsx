import { useState } from 'react';
import { CalendarCheck, Car, MapPin, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanTab } from './PlanTab';
import { LocationTab } from './LocationTab';
import { RidesTab } from './RidesTab';
import { StatusTab } from './StatusTab';

type MiniTab = 'plan' | 'location' | 'rides' | 'status';

interface RallyHomeTabsProps {
  event: any;
  isAttending: boolean;
  canManage: boolean;
  isLiveEvent: boolean;
  isAfterRally: boolean;
  isDD: boolean;
  myDDRequest?: any;
  widgetAction: 'heading-home' | 'arrived' | null;
  onWidgetActionHandled: () => void;
  onHeadingHomeStart: (destination: string) => void;
  onArrived: () => void;
  onInvite?: () => void;
}

const TABS: { value: MiniTab; label: string; icon: typeof CalendarCheck }[] = [
  { value: 'plan', label: 'Plan', icon: CalendarCheck },
  { value: 'location', label: 'Location', icon: MapPin },
  { value: 'rides', label: 'Rides', icon: Car },
  { value: 'status', label: 'Status', icon: ShieldCheck },
];

export function RallyHomeTabs({
  event,
  isAttending,
  canManage,
  isLiveEvent,
  isAfterRally,
  isDD,
  myDDRequest,
  widgetAction,
  onWidgetActionHandled,
  onHeadingHomeStart,
  onArrived,
  onInvite,
}: RallyHomeTabsProps) {
  const [tab, setTab] = useState<MiniTab>(isAfterRally ? 'status' : 'plan');

  return (
    <div className="space-y-4">
      {/* Mini tab bar */}
      <div className="-mx-1 overflow-x-auto">
        <div className="flex min-w-full gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
          {TABS.map(({ value, label, icon: Icon }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cn(
                  'flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold font-montserrat transition-colors',
                  active
                    ? 'bg-rally-cream text-primary shadow-[0_2px_12px_rgba(244,122,25,0.25)]'
                    : 'text-white/60 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'plan' && (
        <PlanTab
          event={event}
          isAttending={isAttending}
          isLive={isLiveEvent}
          onHeadingHomeStart={onHeadingHomeStart}
          onArrived={onArrived}
          widgetAction={widgetAction}
          onWidgetActionHandled={onWidgetActionHandled}
        />
      )}

      {tab === 'location' && (
        <LocationTab
          event={event}
          isAttending={isAttending}
          showMap={isLiveEvent || isAfterRally}
          onInvite={onInvite}
        />
      )}

      {tab === 'rides' && (
        <RidesTab
          event={event}
          isAttending={isAttending}
          isLive={isLiveEvent}
          isAfterRally={isAfterRally}
          isDD={isDD}
          myDDRequest={myDDRequest}
        />
      )}

      {tab === 'status' && (
        <StatusTab
          event={event}
          canManage={canManage}
          isAfterRally={isAfterRally}
        />
      )}
    </div>
  );
}
