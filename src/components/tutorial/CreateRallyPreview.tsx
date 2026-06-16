import { useEffect, useRef, useState } from 'react';
import { Tag, MapPin, Clock } from 'lucide-react';

const NAME_TEXT = 'Thirsty Thursday';
const LOCATION_TEXT = "Johnnie MacCracken's Celtic Firehouse Pub";
const TIME_TEXT = '10:00 PM';

export default function CreateRallyPreview() {
  const [showCreate, setShowCreate] = useState(false);
  const [ripple, setRipple] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showPills, setShowPills] = useState(false);
  const [showSend, setShowSend] = useState(false);

  const [nameTyped, setNameTyped] = useState('');
  const [locationTyped, setLocationTyped] = useState('');
  const [timeTyped, setTimeTyped] = useState('');

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    const addT = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(setTimeout(fn, ms));
    };

    const typewrite = (
      text: string,
      setter: (s: string) => void,
      perChar: number,
    ) => {
      let i = 0;
      const id = setInterval(() => {
        i += 1;
        setter(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(id);
        }
      }, perChar);
      intervalsRef.current.push(id);
    };

    addT(() => setShowCreate(true), 300);
    addT(() => setRipple(true), 800);
    addT(() => setRipple(false), 1050);
    addT(() => setShowName(true), 1100);
    addT(() => typewrite(NAME_TEXT, setNameTyped, 40), 1400);
    addT(() => setShowLocation(true), 2100);
    addT(() => typewrite(LOCATION_TEXT, setLocationTyped, 25), 2400);
    addT(() => setShowTime(true), 3500);
    addT(() => typewrite(TIME_TEXT, setTimeTyped, 50), 3800);
    addT(() => setShowPills(true), 4300);
    addT(() => setShowSend(true), 4800);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
      timeoutsRef.current = [];
      intervalsRef.current = [];
    };
  }, []);

  const rowBase =
    'transition-all duration-300 ease-out';
  const hidden = 'opacity-0 translate-y-[8px]';
  const shown = 'opacity-100 translate-y-0';

  const fieldRow =
    'flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5';
  const labelCls =
    'text-[9px] uppercase tracking-wider text-white/40';
  const valueCls = 'text-[12px] font-semibold text-white';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 my-4">
      <p className="text-[10px] font-bold tracking-widest text-white/40 mb-2.5 uppercase">
        Create a R@lly
      </p>

      <div className="space-y-2">
        {/* Row 1 — Create button */}
        <div
          className={`${rowBase} ${showCreate ? shown : hidden}`}
          style={{
            transform: `${showCreate ? 'translateY(0)' : 'translateY(8px)'} scale(${ripple ? 0.96 : 1})`,
            transition:
              'opacity 300ms ease-out, transform 250ms ease-out',
            opacity: showCreate ? 1 : 0,
          }}
        >
          <div className="w-full h-9 rounded-xl bg-[#F47A19]/15 border border-[#F47A19]/40 flex items-center justify-center">
            <span className="text-[11px] font-bold text-[#F47A19] tracking-wider">
              + CREATE R@LLY
            </span>
          </div>
        </div>

        {/* Row 2 — Name */}
        <div className={`${rowBase} ${showName ? shown : hidden}`}>
          <div className={fieldRow}>
            <Tag size={12} className="text-white/40 shrink-0" />
            <span className={labelCls}>NAME</span>
            <span className={`${valueCls} truncate`}>{nameTyped}</span>
          </div>
        </div>

        {/* Row 3 — Location */}
        <div className={`${rowBase} ${showLocation ? shown : hidden}`}>
          <div className={fieldRow}>
            <MapPin size={12} className="text-white/40 shrink-0" />
            <span className={labelCls}>LOCATION</span>
            <span className={`${valueCls} truncate`}>{locationTyped}</span>
          </div>
        </div>

        {/* Row 4 — Time */}
        <div className={`${rowBase} ${showTime ? shown : hidden}`}>
          <div className={fieldRow}>
            <Clock size={12} className="text-white/40 shrink-0" />
            <span className={labelCls}>TIME</span>
            <span className={`${valueCls} truncate`}>{timeTyped}</span>
          </div>
        </div>

        {/* Row 5 — Pills */}
        <div
          className="flex gap-2 transition-all duration-300 ease-out"
          style={{
            opacity: showPills ? 1 : 0,
            transform: showPills ? 'translateX(0)' : 'translateX(-8px)',
          }}
        >
          <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/60">🎩 DRESS CODE</span>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/60">🎵 SONG RECS</span>
          </div>
        </div>

        {/* Row 6 — Send CTA */}
        <div className={`${rowBase} ${showSend ? shown : hidden}`}>
          <div
            className="w-full h-10 rounded-xl bg-[#F47A19] shadow-[0_0_16px_rgba(244,122,25,0.5)] flex items-center justify-center"
            style={{
              animation: showSend
                ? 'rally-send-pulse 1800ms ease-in-out infinite'
                : 'none',
            }}
          >
            <span className="text-[12px] font-bold text-black tracking-wider">
              SEND R@LLY
            </span>
          </div>
        </div>
      </div>

      <style>{`@keyframes rally-send-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }`}</style>
    </div>
  );
}
