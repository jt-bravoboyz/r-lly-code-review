import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ScanCheckbox } from './ScanCheckbox';
import { useHaptics } from '@/hooks/useHaptics';
import type { ScannedReceipt, ScanCompletePayload } from './scanReceiptTypes';

interface Props {
  receipt: ScannedReceipt;
  onSend: (payload: ScanCompletePayload) => void;
}

export function ScanItemSelectView({ receipt, onSend }: Props) {
  const { triggerHaptic } = useHaptics();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    triggerHaptic('light');
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const totals = useMemo(() => {
    const selectedSubtotal = Array.from(selected).reduce(
      (s, i) => s + (receipt.items[i]?.price ?? 0),
      0,
    );
    const ratio = receipt.subtotal > 0 ? selectedSubtotal / receipt.subtotal : 0;
    const yourTax = +(receipt.tax * ratio).toFixed(2);
    const yourTip = +(receipt.tip * ratio).toFixed(2);
    const yourTotal = +(selectedSubtotal + yourTax + yourTip).toFixed(2);
    return { selectedSubtotal: +selectedSubtotal.toFixed(2), yourTax, yourTip, yourTotal };
  }, [selected, receipt]);

  const handleSend = () => {
    triggerHaptic('medium');
    const items = Array.from(selected).map((i) => ({
      description: receipt.items[i].name,
      quantity: 1,
      unit_price_cents: Math.round(receipt.items[i].price * 100),
    }));
    onSend({
      items,
      subtotal_cents: Math.round(totals.selectedSubtotal * 100),
      tax_cents: Math.round(totals.yourTax * 100),
      tip_cents: Math.round(totals.yourTip * 100),
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <h2 className="text-xl font-semibold tracking-tight">Tap what's yours.</h2>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 divide-y divide-white/5 overflow-hidden"
      >
        {receipt.items.map((it, idx) => (
          <motion.button
            key={idx}
            type="button"
            onClick={() => toggle(idx)}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
          >
            <span className="flex-1 text-sm font-medium">{it.name}</span>
            <span className="text-sm tabular-nums text-white/80">${it.price.toFixed(2)}</span>
            <ScanCheckbox checked={selected.has(idx)} onChange={() => toggle(idx)} />
          </motion.button>
        ))}
      </motion.div>

      {/* Live totals */}
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 space-y-1.5">
        <Row label="Subtotal" value={totals.selectedSubtotal} />
        <Row label="Tax" value={totals.yourTax} />
        <Row label="Tip" value={totals.yourTip} />
        <div className="h-px bg-white/10 my-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/70">Your total.</span>
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: '#F47A19', textShadow: '0 0 18px rgba(244,122,25,0.45)' }}
          >
            ${totals.yourTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-gradient-to-t from-background via-background/90 to-transparent">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSend}
          disabled={selected.size === 0}
          className="relative w-full h-14 rounded-2xl text-white font-semibold text-base overflow-hidden disabled:opacity-50"
          style={{
            backgroundColor: '#F47A19',
            boxShadow: 'inset 0 -2px 6px rgba(0,0,0,0.25), 0 8px 24px -6px rgba(244,122,25,0.5)',
          }}
        >
          <span className="absolute inset-x-0 top-0 h-[30%] pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0))' }} />
          <span className="relative">Send request.</span>
        </motion.button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className="tabular-nums text-white/85">${value.toFixed(2)}</span>
    </div>
  );
}
