interface MockCard {
  title: string;
  meta: string;
  img: string;
}

interface ComingSoonScreenProps {
  tag: string;
  title: React.ReactNode;
  subtitle: string;
  mockCards?: MockCard[];
}

const DEFAULT_CARDS: MockCard[] = [
  { title: 'Skybar Rooftop', meta: 'Live Now · 247 going', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=60' },
  { title: 'Warehouse Party', meta: 'Tonight 11PM · 89 going', img: 'https://images.unsplash.com/photo-1571266028243-d220c6a7b48e?w=400&q=60' },
  { title: 'Sundown Sessions', meta: 'Saturday · 156 going', img: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=60' },
  { title: 'The Local', meta: 'Tonight · 42 going', img: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&q=60' },
  { title: 'Neon Nights', meta: 'Friday 10PM · 312 going', img: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=400&q=60' },
  { title: 'Rooftop Reset', meta: 'Sunday Brunch · 78 going', img: 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=400&q=60' },
  { title: 'Basement Sessions', meta: 'Tonight 9PM · 64 going', img: 'https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=400&q=60' },
  { title: 'Golden Hour Garden', meta: 'Saturday 6PM · 198 going', img: 'https://images.unsplash.com/photo-1533777324565-a040eb52facd?w=400&q=60' },
  { title: 'Lantern Loft', meta: 'Friday 11PM · 121 going', img: 'https://images.unsplash.com/photo-1519214605650-76a613ee3245?w=400&q=60' },
  { title: 'Pier 7 Afters', meta: 'Sunday 2AM · 53 going', img: 'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?w=400&q=60' },
];

function MockCardRow({ title, meta, img }: MockCard) {
  return (
    <div className="rounded-2xl overflow-hidden border border-foreground/10 bg-foreground/[0.04]">
      <div className="aspect-[16/10] w-full overflow-hidden bg-foreground/10">
        <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <div className="text-base font-bold text-foreground font-montserrat">{title}</div>
        <div className="mt-1 text-xs text-foreground/70 font-montserrat">{meta}</div>
      </div>
    </div>
  );
}

export function ComingSoonScreen({ tag, title, subtitle, mockCards = DEFAULT_CARDS }: ComingSoonScreenProps) {
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
        @keyframes rally-feed-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-1/3 -left-24 h-80 w-80 rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
        style={{ filter: 'blur(20px) saturate(1.2)', opacity: 0.36 }}
      >
        <div className="px-4 will-change-transform" style={{ animation: 'rally-feed-scroll 60s linear infinite' }}>
          <div className="flex flex-col gap-5 pt-20 pb-5">
            {mockCards.map((c, i) => <MockCardRow key={`a-${i}`} {...c} />)}
          </div>
          <div className="flex flex-col gap-5 pb-20">
            {mockCards.map((c, i) => <MockCardRow key={`b-${i}`} {...c} />)}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-background via-background/80 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/80 to-transparent" aria-hidden />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
        <div
          className="relative w-[84%] max-w-sm rounded-3xl border border-white/40 dark:border-white/10 bg-white/55 dark:bg-black/45 px-7 py-9 text-center backdrop-blur-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
          style={{
            animation: 'rally-breath 3.6s ease-in-out infinite',
            backdropFilter: 'blur(28px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
          }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-foreground/55 font-montserrat">
            {tag}
          </div>
          <h1 className="mt-5 text-4xl font-extrabold uppercase tracking-[0.06em] text-foreground font-montserrat">
            {title}
          </h1>
          <p className="mt-3 text-sm text-foreground/65 font-montserrat">{subtitle}</p>
          <div className="mx-auto my-7 h-px w-12 bg-foreground/15" />
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F47A19]" style={{ animation: 'rally-blink 1.8s ease-in-out infinite' }} />
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F47A19] font-montserrat">
                Stand By
              </span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-foreground/55 font-montserrat">
              Launching Soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
