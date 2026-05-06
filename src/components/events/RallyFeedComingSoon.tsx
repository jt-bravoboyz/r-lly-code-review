const GHOST_CARDS = [
  { title: 'Skybar Rooftop', meta: 'Live Now · 247 going' },
  { title: 'Warehouse Party', meta: 'Tonight 11PM · 89 going' },
  { title: 'Sundown Sessions', meta: 'Saturday · 156 going' },
  { title: 'The Local', meta: 'Tonight · 42 going' },
];

export function RallyFeedComingSoon() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <style>{`
        @keyframes rally-breath {
          0%, 100% { box-shadow: inset 0 0 22px hsl(22 90% 52% / 0.10), 0 0 28px hsl(22 90% 52% / 0.06); }
          50% { box-shadow: inset 0 0 36px hsl(22 90% 52% / 0.28), 0 0 48px hsl(22 90% 52% / 0.18); }
        }
        @keyframes rally-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.22; }
        }
        @keyframes rally-drift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-1/3 -left-24 h-80 w-80 rounded-full bg-primary/8 blur-[120px]" />
      </div>

      {/* Ghost preview stack */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none px-4 pt-24"
        style={{ filter: 'blur(14px)', opacity: 0.22, animation: 'rally-drift 32s ease-in-out infinite' }}
      >
        <div className="flex flex-col gap-5">
          {GHOST_CARDS.map((c, i) => (
            <div
              key={i}
              className="h-44 w-full rounded-2xl border border-white/10 bg-white/[0.05]"
              style={{ opacity: 1 - i * 0.12 }}
            >
              <div className="flex h-full flex-col justify-end p-5">
                <div className="text-lg font-bold text-white">{c.title}</div>
                <div className="mt-1 text-xs text-white/70">{c.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top + bottom fade overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" aria-hidden />

      {/* Centered glass module */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
        <div
          className="relative w-[84%] max-w-sm rounded-3xl border border-white/10 bg-black/55 px-7 py-9 text-center backdrop-blur-2xl"
          style={{
            animation: 'rally-breath 3.6s ease-in-out infinite',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Classified tag */}
          <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/50 font-montserrat">
            Classified — Tier 02
          </div>

          {/* Headline */}
          <h1 className="mt-5 text-4xl font-extrabold uppercase tracking-[0.06em] text-white font-montserrat">
            R<span className="text-primary">@</span>LLY FEED
          </h1>

          {/* Subhead */}
          <p className="mt-3 text-sm text-white/65 font-montserrat">
            Public rallies. Live near you.
          </p>

          {/* Divider */}
          <div className="mx-auto my-7 h-px w-12 bg-white/15" />

          {/* Status */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#F47A19]"
                style={{ animation: 'rally-blink 1.8s ease-in-out infinite' }}
              />
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F47A19] font-montserrat">
                Stand By
              </span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/55 font-montserrat">
              Launching Soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
