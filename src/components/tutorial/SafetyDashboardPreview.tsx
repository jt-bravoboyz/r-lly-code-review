import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const MOCK_ATTENDEES = [
  { name: 'Sko', avatarUrl: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/8e66c7bd-5fa3-41ab-bcce-3a861e0e6e0b/avatar.jpg', status: 'Arrived Safely', dotClass: 'bg-green-500', badgeClass: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'JT', avatarUrl: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/6b3ae8dd-fb12-4a48-b3b0-9a850b5daba8/avatar.jpg', status: 'En Route', dotClass: 'bg-orange-500', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200' },
  { name: 'Nick', avatarUrl: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/cdba9c99-e0aa-48c8-8dde-39af364f57e4/avatar.jpg', status: "Hasn't Left", dotClass: 'bg-blue-500', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
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
              <AvatarImage src={a.avatarUrl} alt={a.name} className="object-cover" />
              <AvatarFallback className="text-[11px] font-semibold bg-white/10 text-white/70">
                {a.name.slice(0, 2)}
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
