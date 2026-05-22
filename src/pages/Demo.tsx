import { useEffect, useState } from 'react';
import { MapPin, Lock, Users, Ticket, Sparkles, ShieldCheck, MessageCircle } from 'lucide-react';

/**
 * Marketing prototype — 7-screen auto-cycling showcase of the R@lly flow.
 * Optimized for screen recording: black canvas, brand orange accents,
 * Montserrat throughout, premium minimal feel.
 *
 * Route: /demo
 */

const SCREENS = [
  'splash',
  'chaos',
  'event',
  'live-map',
  'ticket',
  'after-rally',
  'rally-home',
] as const;

type Screen = (typeof SCREENS)[number];

const ORANGE = '#F47A19';

export default function Demo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SCREENS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen w-full bg-black flex flex-col items-center justify-center font-montserrat overflow-hidden"
      style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}
    >
      {/* Ambient orange glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
        style={{ background: `radial-gradient(circle, ${ORANGE} 0%, transparent 60%)` }}
      />

      {/* Phone frame */}
      <div
        className="relative w-[375px] h-[667px] rounded-[3.5rem] bg-black border border-white/10 shadow-[0_30px_120px_-20px_rgba(244,122,25,0.4)] overflow-hidden"
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-30 border border-white/10 border-t-0" />

        {/* Screens */}
        <div className="relative w-full h-full">
          {SCREENS.map((screen, i) => (
            <div
              key={screen}
              className="absolute inset-0 transition-all duration-700 ease-out"
              style={{
                opacity: i === index ? 1 : 0,
                transform: `translateY(${i === index ? 0 : i < index ? -20 : 20}px)`,
                pointerEvents: i === index ? 'auto' : 'none',
              }}
            >
              <ScreenView screen={screen} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation dots */}
      <div className="mt-8 flex gap-2 z-10">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === index ? 28 : 8,
              height: 8,
              backgroundColor: i === index ? ORANGE : 'rgba(255,255,255,0.2)',
            }}
            aria-label={`Go to screen ${i + 1}`}
          />
        ))}
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/30 font-black">
        R@lly · Nights That Matter
      </p>
    </div>
  );
}

function ScreenView({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'splash':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
            style={{ backgroundColor: ORANGE, boxShadow: `0 20px 60px -10px ${ORANGE}` }}
          >
            <span className="text-white font-black text-4xl">R@</span>
          </div>
          <h1 className="text-white text-5xl font-black tracking-tighter">R@lly</h1>
          <p className="text-white/60 text-sm mt-3 font-bold">Nights That Matter</p>
          <button
            className="mt-10 h-14 px-10 rounded-full font-black text-white text-sm uppercase tracking-widest"
            style={{ backgroundColor: ORANGE, boxShadow: `0 8px 32px ${ORANGE}80` }}
          >
            Let's R@lly
          </button>
        </div>
      );

    case 'chaos':
      return (
        <div className="w-full h-full flex flex-col px-6 pt-16 pb-8">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mb-3">
            Group chat → R@lly
          </p>
          <div className="space-y-2 mb-4 opacity-50">
            {['where r we going', 'idk u pick', 'wait who has the addy', '???'].map((t, i) => (
              <div key={i} className="bg-white/5 rounded-2xl px-4 py-2 max-w-[70%] text-white/70 text-xs">
                {t}
              </div>
            ))}
          </div>
          <div
            className="mt-auto rounded-3xl p-5 border"
            style={{
              backgroundColor: 'rgba(244,122,25,0.08)',
              borderColor: `${ORANGE}40`,
              boxShadow: `0 20px 60px -10px ${ORANGE}50`,
            }}
          >
            <p className="text-[10px] uppercase tracking-widest font-black mb-2" style={{ color: ORANGE }}>
              You're invited
            </p>
            <p className="text-white font-black text-xl">Saturday · 9PM</p>
            <p className="text-white/60 text-xs mt-1">Locked address · 7 going</p>
            <button
              className="mt-4 w-full h-11 rounded-2xl font-black text-white text-xs uppercase tracking-wider"
              style={{ backgroundColor: ORANGE }}
            >
              I'm In
            </button>
          </div>
        </div>
      );

    case 'event':
      return (
        <div className="w-full h-full flex flex-col px-6 pt-16 pb-8">
          <div className="h-32 rounded-3xl mb-4" style={{ background: `linear-gradient(135deg, ${ORANGE}, #c44b00)` }} />
          <h2 className="text-white font-black text-2xl tracking-tight">The Underground</h2>
          <div className="flex items-center gap-2 mt-2">
            <Lock className="h-3 w-3" style={{ color: ORANGE }} />
            <p className="text-white/50 text-xs font-bold">Address unlocks 1hr before</p>
          </div>
          <div className="mt-4 bg-white/5 rounded-2xl p-3 flex items-center gap-3">
            <Users className="h-4 w-4" style={{ color: ORANGE }} />
            <p className="text-white text-xs font-bold">7 confirmed</p>
            <div className="ml-auto flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-black"
                  style={{ backgroundColor: i % 2 ? ORANGE : '#fff' }}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 bg-white/5 rounded-2xl p-3 flex items-center gap-3">
            <MessageCircle className="h-4 w-4" style={{ color: ORANGE }} />
            <p className="text-white text-xs font-bold">Squad chat · 12 new</p>
          </div>
        </div>
      );

    case 'live-map':
      return (
        <div className="w-full h-full relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(244,122,25,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(244,122,25,0.05) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              backgroundColor: '#0a0a0a',
            }}
          />
          {/* Pins */}
          {[
            { top: '30%', left: '40%' },
            { top: '50%', left: '60%' },
            { top: '65%', left: '35%' },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{
                ...pos,
                backgroundColor: ORANGE,
                boxShadow: `0 0 20px ${ORANGE}, 0 0 0 6px ${ORANGE}30`,
              }}
            />
          ))}
          <div className="absolute top-16 left-6 right-6">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Live Map</p>
            <p className="text-white font-black text-xl mt-1">Squad incoming</p>
          </div>
          <div className="absolute bottom-8 left-6 right-6 bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <p className="text-white text-xs font-bold">3 en route · ETA 8 min</p>
          </div>
        </div>
      );

    case 'ticket':
      return (
        <div className="w-full h-full flex flex-col px-6 pt-16 pb-8">
          <Ticket className="h-6 w-6 mb-3" style={{ color: ORANGE }} />
          <h2 className="text-white font-black text-2xl tracking-tight">Cover Charge</h2>
          <p className="text-white/50 text-xs mt-1">Skip the line at the door</p>
          <div className="mt-6 space-y-3">
            {[
              { label: 'GA', price: '$20', active: false },
              { label: 'VIP Booth', price: '$80', active: true },
              { label: 'Bottle Service', price: '$320', active: false },
            ].map((t) => (
              <div
                key={t.label}
                className="rounded-2xl p-4 flex items-center justify-between border"
                style={{
                  backgroundColor: t.active ? `${ORANGE}15` : 'rgba(255,255,255,0.04)',
                  borderColor: t.active ? `${ORANGE}60` : 'rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-white font-black text-sm">{t.label}</p>
                <p className="font-black text-sm" style={{ color: t.active ? ORANGE : '#fff' }}>
                  {t.price}
                </p>
              </div>
            ))}
          </div>
          <button
            className="mt-auto h-14 rounded-2xl font-black text-white text-sm uppercase tracking-widest"
            style={{ backgroundColor: ORANGE, boxShadow: `0 8px 32px ${ORANGE}60` }}
          >
            Get Ticket
          </button>
        </div>
      );

    case 'after-rally':
      return (
        <div className="w-full h-full flex flex-col px-6 pt-16 pb-8">
          <Sparkles className="h-6 w-6 mb-3" style={{ color: ORANGE }} />
          <h2 className="text-white font-black text-2xl tracking-tight">After R@lly</h2>
          <p className="text-white/50 text-xs mt-1">Where's the night going?</p>
          <div className="mt-6 space-y-3">
            {['Late Night Diner', 'Rooftop Bar', 'Karaoke Lounge'].map((venue, i) => (
              <div
                key={venue}
                className="rounded-2xl p-4 bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-black text-sm">{venue}</p>
                  <p className="text-white/40 text-[11px] font-bold mt-0.5">
                    {(i + 2) * 3} crew voted
                  </p>
                </div>
                <div
                  className="h-8 px-3 rounded-full flex items-center font-black text-[10px] uppercase tracking-wider"
                  style={{ backgroundColor: `${ORANGE}20`, color: ORANGE }}
                >
                  Vote
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-auto h-14 rounded-2xl font-black text-white text-sm uppercase tracking-widest"
            style={{ backgroundColor: ORANGE, boxShadow: `0 8px 32px ${ORANGE}60` }}
          >
            Lock In Next Stop
          </button>
        </div>
      );

    case 'rally-home':
      return (
        <div className="w-full h-full flex flex-col px-6 pt-16 pb-8">
          <ShieldCheck className="h-6 w-6 mb-3" style={{ color: ORANGE }} />
          <h2 className="text-white font-black text-2xl tracking-tight">R@lly Home</h2>
          <p className="text-white/50 text-xs mt-1">Crew safety · live tracking</p>
          <div className="mt-6 space-y-3">
            {[
              { name: 'Jordan', status: 'Home safe', done: true },
              { name: 'Alex', status: 'En route · 4 min', done: false },
              { name: 'Sam', status: 'Walking · 12 min', done: false },
              { name: 'Riley', status: 'Home safe', done: true },
            ].map((c) => (
              <div
                key={c.name}
                className="rounded-2xl p-4 bg-white/5 border border-white/10 flex items-center gap-3"
              >
                <MapPin
                  className="h-4 w-4"
                  style={{ color: c.done ? '#4ade80' : ORANGE }}
                />
                <div className="flex-1">
                  <p className="text-white font-black text-sm">{c.name}</p>
                  <p className="text-white/40 text-[11px] font-bold">{c.status}</p>
                </div>
                {c.done && (
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            className="mt-auto h-14 rounded-2xl font-black text-white text-sm uppercase tracking-widest"
            style={{ backgroundColor: ORANGE, boxShadow: `0 8px 32px ${ORANGE}60` }}
          >
            View Recap
          </button>
        </div>
      );
  }
}
