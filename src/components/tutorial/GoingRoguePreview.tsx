import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

const AVATARS = {
  sko: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/8e66c7bd-5fa3-41ab-bcce-3a861e0e6e0b/avatar.jpg',
  jt: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/6b3ae8dd-fb12-4a48-b3b0-9a850b5daba8/avatar.jpg',
  nick: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/cdba9c99-e0aa-48c8-8dde-39af364f57e4/avatar.jpg',
} as const;

export default function GoingRoguePreview() {
  const [buttonTapped, setButtonTapped] = useState(false);
  const [buttonState, setButtonState] = useState<'default' | 'muted'>('default');
  const [momentCardVisible, setMomentCardVisible] = useState(false);
  const [jtVisible, setJtVisible] = useState(false);
  const [nickVisible, setNickVisible] = useState(false);
  const [bottomTagVisible, setBottomTagVisible] = useState(false);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const T = (fn: () => void, ms: number) => timeouts.push(setTimeout(fn, ms));

    T(() => setButtonTapped(true), 600);
    T(() => setButtonTapped(false), 850);
    T(() => setButtonState('muted'), 900);
    T(() => setMomentCardVisible(true), 1300);
    T(() => setJtVisible(true), 2000);
    T(() => setNickVisible(true), 2700);
    T(() => setBottomTagVisible(true), 3400);

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="border border-white/10 bg-white/5 p-3 my-4 rounded-2xl overflow-hidden">
      <div className="text-[10px] font-bold tracking-widest text-white/40 mb-2.5 uppercase">
        THE PLOT TWIST
      </div>

      <div className="space-y-3">
        {/* Going Rogue button */}
        <div
          className={
            buttonState === 'default'
              ? 'w-full border border-red-500 text-red-500 font-bold rounded-md py-2 px-4 bg-transparent flex items-center justify-center gap-2 transition-all duration-300'
              : 'w-full border border-red-500/30 text-red-400/60 font-bold rounded-md py-2 px-4 bg-red-500/5 cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300'
          }
          style={{
            transform: buttonTapped ? 'scale(0.96)' : 'scale(1)',
            transitionDuration: buttonTapped ? '250ms' : undefined,
          }}
        >
          {buttonState === 'default' ? (
            <>
              <Flame size={18} />
              <span>I'm Going Rogue</span>
              <Flame size={18} className="scale-x-[-1]" />
            </>
          ) : (
            <>
              <Flame size={18} className="opacity-60" />
              <span>Gone Rogue 🔥</span>
            </>
          )}
        </div>

        {/* Moment card */}
        <div
          className="rounded-xl bg-white/5 border border-white/10 p-2.5 space-y-2 transition-all duration-[400ms] ease-out"
          style={{
            opacity: momentCardVisible ? 1 : 0,
            transform: momentCardVisible ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full border border-white/20 bg-cover bg-center shrink-0"
              style={{ backgroundImage: `url('${AVATARS.sko}')` }}
            />
            <div className="text-[11px] text-white/80 font-semibold">Sko went rogue 🔥</div>
            <div className="text-[9px] text-white/40 ml-auto">now</div>
          </div>

          {/* JT reaction */}
          <div
            className="flex items-center gap-2 transition-all duration-300 ease-out"
            style={{
              opacity: jtVisible ? 1 : 0,
              transform: jtVisible ? 'scale(1)' : 'scale(0.75)',
              transformOrigin: 'left center',
            }}
          >
            <div
              className="w-4 h-4 rounded-full bg-cover bg-center shrink-0"
              style={{ backgroundImage: `url('${AVATARS.jt}')` }}
            />
            <span className="text-lg leading-none">🤮</span>
          </div>

          {/* Nick reaction */}
          <div
            className="flex items-center gap-2 transition-all duration-300 ease-out"
            style={{
              opacity: nickVisible ? 1 : 0,
              transform: nickVisible ? 'scale(1)' : 'scale(0.75)',
              transformOrigin: 'left center',
            }}
          >
            <div
              className="w-4 h-4 rounded-full bg-cover bg-center shrink-0"
              style={{ backgroundImage: `url('${AVATARS.nick}')` }}
            />
            <div className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] text-white/80">
              🙄 bro again
            </div>
          </div>

          {/* Bottom tag */}
          <div
            className="text-[9px] uppercase tracking-widest text-white/40 text-center pt-1.5 border-t border-white/10 transition-opacity duration-[400ms]"
            style={{ opacity: bottomTagVisible ? 1 : 0 }}
          >
            Squad reacts with an emoji
          </div>
        </div>
      </div>
    </div>
  );
}
