interface ComingSoonInlineProps {
  tag: string;
  title: React.ReactNode;
  subtitle: string;
}

/** Compact inline coming-soon card for embedding inside other pages (e.g. Profile sections). */
export function ComingSoonInline({ tag, title, subtitle }: ComingSoonInlineProps) {
  return (
    <div className="relative">
      <style>{`
        @keyframes rally-breath-inline {
          0%, 100% { box-shadow: inset 0 0 14px hsl(22 90% 52% / 0.08), 0 0 18px hsl(22 90% 52% / 0.05); }
          50% { box-shadow: inset 0 0 22px hsl(22 90% 52% / 0.20), 0 0 28px hsl(22 90% 52% / 0.14); }
        }
        @keyframes rally-blink-inline {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.22; }
        }
      `}</style>
      <div
        className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/55 dark:bg-black/45 px-5 py-6 text-center backdrop-blur-xl shadow-[0_12px_30px_-12px_rgba(0,0,0,0.3)]"
        style={{
          animation: 'rally-breath-inline 3.6s ease-in-out infinite',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        }}
      >
        <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-foreground/55 font-montserrat">
          {tag}
        </div>
        <h3 className="mt-3 text-2xl font-extrabold uppercase tracking-[0.05em] text-foreground font-montserrat">
          {title}
        </h3>
        <p className="mt-2 text-xs text-foreground/65 font-montserrat">{subtitle}</p>
        <div className="mx-auto my-4 h-px w-10 bg-foreground/15" />
        <div className="flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F47A19]" style={{ animation: 'rally-blink-inline 1.8s ease-in-out infinite' }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F47A19] font-montserrat">
            Launching Soon
          </span>
        </div>
      </div>
    </div>
  );
}
