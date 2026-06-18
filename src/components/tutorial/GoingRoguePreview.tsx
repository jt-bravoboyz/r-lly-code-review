import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

const AVATARS = {
  sko: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/8e66c7bd-5fa3-41ab-bcce-3a861e0e6e0b/avatar.jpg',
  jt: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/6b3ae8dd-fb12-4a48-b3b0-9a850b5daba8/avatar.jpg',
  nick: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/cdba9c99-e0aa-48c8-8dde-39af364f57e4/avatar.jpg',
} as const;

export default function GoingRoguePreview() {
  const [buttonTapped, setButtonTapped] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [confirmGlowing, setConfirmGlowing] = useState(false);
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
    T(() => setDialogVisible(true), 900);
    T(() => setConfirmGlowing(true), 1700);
    T(() => setConfirmGlowing(false), 1950);
    T(() => setDialogVisible(false), 2000);
    T(() => setButtonState('muted'), 2200);
    T(() => setMomentCardVisible(true), 2400);
    T(() => setJtVisible(true), 3100);
    T(() => setNickVisible(true), 3800);
    T(() => setBottomTagVisible(true), 4500);

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

        {/* Confirmation dialog */}
        <div
          className="rounded-xl bg-zinc-900 border border-white/10 overflow-hidden transition-all ease-out"
          style={{
            opacity: dialogVisible ? 1 : 0,
            maxHeight: dialogVisible ? 200 : 0,
            transform: dialogVisible ? 'translateY(0)' : 'translateY(-8px)',
            transitionDuration: dialogVisible ? '400ms' : '300ms',
          }}
        >
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <Flame size={14} className="text-red-500" />
              </div>
              <div>
                <div className="text-[12px] font-bold text-white">Going Rogue? 🔥</div>
                <div className="text-[10px] text-white/60">Your whole crew will see this.</div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <div className="flex-1 py-1.5 rounded-md text-[10px] font-semibold text-white/60 border border-white/10 bg-transparent text-center">
                Nevermind
              </div>
              <div
                className="flex-1 py-1.5 rounded-md text-[10px] font-bold text-white text-center transition-all duration-200"
                style={{
                  backgroundColor: confirmGlowing ? 'rgb(220, 38, 38)' : 'rgb(239, 68, 68)',
                  boxShadow: confirmGlowing ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
                }}
              >
                Confirm — Go Rogue 🔥
              </div>
            </div>
          </div>
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
