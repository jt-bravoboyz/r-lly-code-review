import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { REACTION_EMOJIS } from './types';

interface Props {
  anchorRect: DOMRect;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionBar({ anchorRect, onPick, onClose }: Props) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const top = Math.max(8, anchorRect.top - 56);
    const barWidth = 280;
    let left = anchorRect.left + anchorRect.width / 2 - barWidth / 2;
    left = Math.max(8, Math.min(window.innerWidth - barWidth - 8, left));
    setPos({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[150]" onClick={onClose} />
      <div
        className="fixed z-[151] flex items-center gap-1 px-2 py-1.5 rounded-full bg-background/80 dark:bg-white/[0.08] backdrop-blur-xl border border-border/60 shadow-2xl animate-scale-in"
        style={{ top: pos.top, left: pos.left, width: 280 }}
      >
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onPick(e);
              onClose();
            }}
            className="h-9 w-9 flex items-center justify-center text-xl rounded-full hover:bg-primary/15 transition-transform hover:scale-125 active:scale-95"
          >
            {e}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}
