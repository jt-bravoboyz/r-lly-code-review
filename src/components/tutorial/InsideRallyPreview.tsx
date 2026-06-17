import { useEffect, useState } from 'react';
import { Car, Shield, MapPin } from 'lucide-react';
import RallyFlagPin from '@/components/tracking/RallyFlagPin';
import { AvatarPin } from '@/components/tracking/AvatarPin';
import { useMapboxToken } from '@/hooks/useMapboxToken';

const VENUE = { lng: -84.5499, lat: 33.9526, zoom: 15 };

const AVATARS = [
  {
    name: 'Sko',
    avatarUrl:
      'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/8e66c7bd-5fa3-41ab-bcce-3a861e0e6e0b/avatar.jpg',
    isCurrentUser: true,
    animation: 'rallyAvatarConverge1 3500ms ease-in-out forwards',
  },
  {
    name: 'JT',
    avatarUrl:
      'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/6b3ae8dd-fb12-4a48-b3b0-9a850b5daba8/avatar.jpg',
    isCurrentUser: false,
    animation: 'rallyAvatarConverge2 3500ms ease-in-out forwards',
  },
  {
    name: 'Nick',
    avatarUrl:
      'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/cdba9c99-e0aa-48c8-8dde-39af364f57e4/avatar.jpg',
    isCurrentUser: false,
    animation: 'rallyAvatarConverge3 3500ms ease-in-out forwards',
  },
];

export default function InsideRallyPreview() {
  const { token } = useMapboxToken();
  const [chipsVisible, setChipsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setChipsVisible(true), 3500);
    return () => clearTimeout(t);
  }, []);

  const mapUrl = token
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${VENUE.lng},${VENUE.lat},${VENUE.zoom},0/600x360@2x?access_token=${token}`
    : null;

  return (
    <div className="border border-white/10 bg-white/5 p-2 my-2 rounded-2xl overflow-hidden">
      <div className="text-[10px] font-bold tracking-widest text-white/40 mb-1.5 uppercase">
        Live R@lly
      </div>

      <div className="space-y-2">
        {/* Map preview */}
        <div className="relative w-full h-[140px] rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
          {mapUrl && (
            <img
              src={mapUrl}
              alt=""
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* R@lly flag pin — anchored at venue */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <RallyFlagPin />
          </div>

          {/* Converging avatars */}
          {AVATARS.map((a, i) => (
            <div
              key={a.name}
              className="absolute z-20"
              style={{
                animation: a.animation,
                transform: 'translate(-50%, -50%)',
                willChange: 'top, left, transform, opacity',
              }}
              data-rally-avatar={i + 1}
            >
              <AvatarPin
                avatarUrl={a.avatarUrl}
                displayName={a.name}
                isCurrentUser={a.isCurrentUser}
              />
            </div>
          ))}
        </div>

        {/* Ride coordination chips */}
        <div className="flex gap-2">
          {[
            { Icon: Shield, label: 'BE DD' },
            { Icon: MapPin, label: 'PICKUP' },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 transition-all duration-500 ease-out ${
                chipsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <Icon size={12} className="text-[#F47A19]/80" />
              <span className="text-[10px] font-semibold text-white/70 tracking-wide">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
