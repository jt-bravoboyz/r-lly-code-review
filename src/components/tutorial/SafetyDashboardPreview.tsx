import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const MOCK_ATTENDEES = [
  { name: 'Alex', initials: 'A', status: 'Arrived Safely', dotClass: 'bg-green-500', badgeClass: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'Jordan', initials: 'J', status: 'En Route', dotClass: 'bg-orange-500', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200' },
  { name: 'Sam', initials: 'S', status: 'Opted In', dotClass: 'bg-blue-500', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
];

export function SafetyDashboardPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 my-4">
      <p className="text-[10px] font-bold tracking-widest text-white/40 mb-2.5 uppercase">
        Host Safety Dashboard
      </p>
      <div className="space-y-2">
        {MOCK_ATTENDEES.map((a) => (
          <div key={a.name} className="flex items-center gap-2.5">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[11px] font-semibold bg-white/10 text-white/70">
                {a.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-white/80 flex-1">{a.name}</span>
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${a.badgeClass}`}>
              {a.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
