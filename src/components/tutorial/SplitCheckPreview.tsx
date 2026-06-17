import { useEffect, useState } from 'react';
import { Plus, Camera, Upload } from 'lucide-react';

const AVATARS = {
  sko: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/8e66c7bd-5fa3-41ab-bcce-3a861e0e6e0b/avatar.jpg',
  jt: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/6b3ae8dd-fb12-4a48-b3b0-9a850b5daba8/avatar.jpg',
  nick: 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/avatars/cdba9c99-e0aa-48c8-8dde-39af364f57e4/avatar.jpg',
} as const;

type Picker = 'sko' | 'jt' | 'nick';

const ITEMS: { key: string; name: string; price: string; pickers: Picker[] }[] = [
  { key: 'wings', name: 'Wings', price: '$14', pickers: ['jt'] },
  { key: 'pitcher', name: 'Pitcher of Beer', price: '$24', pickers: ['sko', 'jt', 'nick'] },
  { key: 'burger', name: 'Burger', price: '$16', pickers: ['sko'] },
  { key: 'fries', name: 'Loaded Fries', price: '$11', pickers: ['nick'] },
];

const SUMMARY: { key: Picker; name: string; amount: string }[] = [
  { key: 'sko', name: 'Sko', amount: '$24' },
  { key: 'jt', name: 'JT', amount: '$22' },
  { key: 'nick', name: 'Nick', amount: '$19' },
];

export default function SplitCheckPreview() {
  const [tabRipple, setTabRipple] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogGone, setDialogGone] = useState(false);
  const [snapGlow, setSnapGlow] = useState(false);
  const [flash, setFlash] = useState(0);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [itemTyped, setItemTyped] = useState<Record<string, string>>({});
  const [itemRowVisible, setItemRowVisible] = useState<Record<string, boolean>>({});
  const [priceVisible, setPriceVisible] = useState<Record<string, boolean>>({});
  const [avatarsRowVisible, setAvatarsRowVisible] = useState(false);
  const [landed, setLanded] = useState<Record<Picker, boolean>>({ sko: false, jt: false, nick: false });
  const [summaryVisible, setSummaryVisible] = useState(false);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    const T = (fn: () => void, ms: number) => timeouts.push(setTimeout(fn, ms));

    // Tap ripple
    T(() => setTabRipple(true), 600);
    T(() => setTabRipple(false), 850);

    // Tab fades, dialog rises
    T(() => setTabVisible(false), 900);
    T(() => setDialogVisible(true), 900);

    // Snap glow + camera flash
    T(() => setSnapGlow(true), 1500);
    T(() => setSnapGlow(false), 1700);
    T(() => setFlash(0.7), 1500);
    T(() => setFlash(0), 1750);

    // Dialog fades out
    T(() => setDialogGone(true), 1700);

    // Receipt fades in
    T(() => setReceiptVisible(true), 1800);

    // Items typewriter
    ITEMS.forEach((item, idx) => {
      const start = 1800 + idx * 350;
      T(() => setItemRowVisible((prev) => ({ ...prev, [item.key]: true })), start);
      T(() => {
        let i = 0;
        const iv = setInterval(() => {
          i++;
          setItemTyped((prev) => ({ ...prev, [item.key]: item.name.slice(0, i) }));
          if (i >= item.name.length) clearInterval(iv);
        }, 40);
        intervals.push(iv);
      }, start + 50);
      const priceStart = start + 50 + item.name.length * 40 + 50;
      T(() => setPriceVisible((prev) => ({ ...prev, [item.key]: true })), priceStart);
    });

    // Avatars appear in row
    T(() => setAvatarsRowVisible(true), 3300);

    // Drop sequence — Sko 3700, JT 3900, Nick 4100
    const order: Picker[] = ['sko', 'jt', 'nick'];
    order.forEach((p, idx) => {
      T(() => setLanded((prev) => ({ ...prev, [p]: true })), 3700 + idx * 200);
    });

    // Summary
    T(() => setSummaryVisible(true), 4500);

    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);

  const allLanded = landed.sko && landed.jt && landed.nick;

  const avatarCircle = (key: Picker, size = 16) => (
    <div
      key={key}
      className="rounded-full border border-white/40 bg-cover bg-center shrink-0"
      style={{ backgroundImage: `url(${AVATARS[key]})`, width: size, height: size }}
    />
  );

  return (
    <div className="border border-white/10 bg-white/5 p-2.5 my-2.5 rounded-2xl overflow-hidden">
      <div className="text-[10.5px] font-bold tracking-widest text-white/40 mb-1.5 uppercase">
        R@LLY TAB
      </div>

      <div className="relative w-full h-[190px] rounded-xl bg-[#0a0a0a] border border-white/10 overflow-hidden">
        {/* Receipt */}
        <div
          className="absolute inset-2 z-10 flex flex-col transition-opacity duration-300"
          style={{ opacity: receiptVisible ? 1 : 0 }}
        >
          <div className="text-[9.5px] uppercase tracking-widest text-white/40 pb-1.5 mb-1.5 border-b border-dashed border-white/15">
            JOHNNIE MACCRACKEN'S · TONIGHT
          </div>

          {ITEMS.map((item) => {
            const placed = item.pickers.filter((p) => landed[p]);
            return (
              <div
                key={item.key}
                className="flex items-center justify-between py-1 text-[10.5px] transition-opacity duration-200"
                style={{ opacity: itemRowVisible[item.key] ? 1 : 0 }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex -space-x-1 w-[28px] justify-start">
                    {placed.map((p) => avatarCircle(p, 14))}
                  </div>
                  <span className="text-white/90 font-medium truncate">
                    {itemTyped[item.key] || ''}
                  </span>
                </div>
                <span
                  className="text-[#F47A19] font-bold transition-opacity duration-200"
                  style={{ opacity: priceVisible[item.key] ? 1 : 0 }}
                >
                  {item.price}
                </span>
              </div>
            );
          })}
        </div>

        {/* Avatars row above receipt (pre-drop) */}
        <div
          className="absolute top-1 left-2 right-2 z-30 flex gap-1 transition-opacity duration-300"
          style={{ opacity: avatarsRowVisible && !allLanded ? 1 : 0 }}
        >
          {(['sko', 'jt', 'nick'] as Picker[]).map((p, i) => (
            <div
              key={p}
              className="transition-all duration-200"
              style={{
                opacity: avatarsRowVisible && !landed[p] ? 1 : 0,
                transform: avatarsRowVisible ? 'scale(1)' : 'scale(0.5)',
                transitionDelay: `${i * 100}ms`,
              }}
            >
              {avatarCircle(p, 12)}
            </div>
          ))}
        </div>

        {/* + NEW TAB pill */}
        {tabVisible && (
          <div
            className="absolute bottom-1.5 right-1.5 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F47A19] text-black text-[10px] font-bold tracking-wide shadow-[0_0_12px_rgba(244,122,25,0.5)] transition-all duration-[250ms]"
            style={{
              transform: tabRipple ? 'scale(0.94)' : 'scale(1)',
              opacity: tabVisible ? 1 : 0,
            }}
          >
            <Plus size={12} />
            NEW TAB
          </div>
        )}

        {/* Snap/Upload dialog */}
        {dialogVisible && (
          <div
            className="absolute bottom-1.5 left-1.5 right-1.5 z-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-2 flex gap-2 transition-all duration-300"
            style={{
              opacity: dialogGone ? 0 : 1,
              transform: dialogGone ? 'translateY(8px)' : 'translateY(0)',
            }}
          >
            <div
              className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-[#F47A19]/20 border border-[#F47A19]/40 text-[10px] font-bold text-[#F47A19] transition-shadow duration-200"
              style={{
                boxShadow: snapGlow ? '0 0 14px 2px rgba(244,122,25,0.7)' : 'none',
              }}
            >
              <Camera size={12} />
              SNAP
            </div>
            <div className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/70">
              <Upload size={12} />
              UPLOAD
            </div>
          </div>
        )}

        {/* Camera flash */}
        <div
          className="absolute inset-0 z-40 bg-white pointer-events-none transition-opacity duration-200"
          style={{ opacity: flash }}
        />

        {/* Final summary */}
        <div
          className="absolute bottom-1.5 left-1.5 right-1.5 z-20 rounded-xl bg-[#F47A19]/15 border border-[#F47A19]/40 p-1 flex items-center justify-around transition-all duration-500"
          style={{
            opacity: summaryVisible ? 1 : 0,
            transform: summaryVisible ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: summaryVisible ? 'auto' : 'none',
          }}
        >
          {SUMMARY.map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-0.5">
              {avatarCircle(s.key, 12)}
              <div className="text-[9px] font-bold text-white/90">{s.name}</div>
              <div className="text-[10px] font-bold text-[#F47A19]">{s.amount}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
