import { useEffect, useState } from 'react';
import { Home, Flag, Bell, Users, User } from 'lucide-react';

const ITEMS = [
  { label: 'Home', Icon: Home },
  { label: 'R@lly', Icon: Flag },
  { label: 'Alerts', Icon: Bell },
  { label: 'Squads', Icon: Users },
  { label: 'Profile', Icon: User },
];

export default function CommandCenterPreview() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const schedule = (ms: number, fn: () => void) => {
      timeouts.push(setTimeout(fn, ms));
    };

    schedule(300, () => setActiveIndex(0));
    schedule(900, () => setActiveIndex(1));
    schedule(1500, () => setActiveIndex(2));
    schedule(2100, () => setActiveIndex(3));
    schedule(2700, () => setActiveIndex(4));
    schedule(3300, () => {
      setActiveIndex(null);
      setSettled(true);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 my-4">
      <p className="text-[10px] font-bold tracking-widest text-white/40 mb-2.5 uppercase">
        Bottom Nav
      </p>
      <div className="grid grid-cols-5 gap-1">
        {ITEMS.map(({ label, Icon }, i) => {
          const isActive = activeIndex === i;
          const idleText = settled ? 'text-white/60' : 'text-white/40';
          return (
            <div
              key={label}
              className={`flex flex-col items-center justify-center h-11 rounded-xl px-1 transition-all duration-300 ease-out ${
                isActive
                  ? 'bg-[#F47A19]/10 shadow-[0_0_12px_rgba(244,122,25,0.4)]'
                  : 'bg-transparent'
              }`}
            >
              <Icon
                size={18}
                className={`transition-colors duration-300 ease-out ${
                  isActive ? 'text-[#F47A19]' : idleText
                }`}
              />
              <span
                className={`text-[9px] font-medium mt-1 transition-colors duration-300 ease-out ${
                  isActive ? 'text-[#F47A19]' : 'text-white/50'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
