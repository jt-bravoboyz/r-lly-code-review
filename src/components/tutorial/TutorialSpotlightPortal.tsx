import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** CSS selector for the element to spotlight. */
  selector: string;
  /** If true, allow taps on the clone to trigger the original element's click. */
  interactive?: boolean;
  /** Optional callback fired when the clone is tapped. */
  onTap?: () => void;
  /** z-index for the clone. Must be above the dim overlay (50) and below the
   *  tutorial card. Default 60. */
  zIndex?: number;
}

/**
 * Portal-based tutorial spotlight.
 *
 * Renders a visual clone of the target element at the document.body root —
 * escaping every parent stacking context — so the spotlighted UI lands fully
 * above the dim overlay at full brightness. The original element is hidden
 * with `visibility: hidden` (NOT display:none) so layout is preserved.
 */
export function TutorialSpotlightPortal({
  selector,
  interactive = true,
  onTap,
  zIndex = 60,
}: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cloneHTML, setCloneHTML] = useState<string | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selector) return;

    let cancelled = false;

    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        targetRef.current = null;
        return;
      }
      // Track target + hide it (preserve layout)
      if (targetRef.current !== el) {
        // Restore previous if we swapped targets
        if (targetRef.current) {
          targetRef.current.style.visibility = '';
        }
        targetRef.current = el;
        setCloneHTML(el.outerHTML);
      }
      el.style.visibility = 'hidden';
      const r = el.getBoundingClientRect();
      if (
        !rect ||
        rect.top !== r.top ||
        rect.left !== r.left ||
        rect.width !== r.width ||
        rect.height !== r.height
      ) {
        if (!cancelled) setRect(r);
      }
    };

    measure();

    // Continuous rAF re-measure so the clone tracks animated targets and
    // late-mounting DOM. Cheap — just a getBoundingClientRect per frame.
    const loop = () => {
      if (cancelled) return;
      measure();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (targetRef.current) {
        targetRef.current.style.visibility = '';
        targetRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector]);

  if (!rect || !cloneHTML) return null;

  const handleTap = () => {
    if (!interactive) return;
    const el = targetRef.current;
    if (el) {
      // Temporarily restore so the click hits an interactive element if needed
      const prev = el.style.visibility;
      el.style.visibility = '';
      try {
        el.click();
      } finally {
        el.style.visibility = prev;
      }
    }
    onTap?.();
  };

  const pad = 8;

  return createPortal(
    <>
      {/* Orange spotlight ring + glow, also via portal so it sits above the dim */}
      <div
        aria-hidden
        className="pointer-events-none fixed rounded-2xl"
        style={{
          top: rect.top - pad - 24,
          left: rect.left - pad - 24,
          width: rect.width + (pad + 24) * 2,
          height: rect.height + (pad + 24) * 2,
          background:
            'radial-gradient(circle, rgba(244,122,25,0.45) 0%, rgba(244,122,25,0.15) 45%, transparent 70%)',
          filter: 'blur(16px)',
          zIndex: zIndex - 1,
          animation: 'tutorial-spotlight-breathe 1.8s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed rounded-lg border-2 border-primary"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow:
            '0 0 28px 6px rgba(244,122,25,0.95), 0 0 56px 14px rgba(244,122,25,0.45)',
          zIndex,
          animation: 'tutorial-spotlight-breathe 1.8s ease-in-out infinite',
        }}
      />
      {/* Visual clone of the original element — full brightness, no dimming */}
      <div
        onClick={handleTap}
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: zIndex + 1,
          cursor: interactive ? 'pointer' : 'default',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      >
        <div
          // Inline-render the original DOM so it visually matches 1:1
          // (glassmorphic surface, icon, label, gradients).
          dangerouslySetInnerHTML={{ __html: cloneHTML }}
          style={{
            width: '100%',
            height: '100%',
            // Reset any inherited visibility from the original wrapper above
            visibility: 'visible',
          }}
        />
      </div>
      <style>{`@keyframes tutorial-spotlight-breathe {
        0%, 100% { opacity: 0.9; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.03); }
      }`}</style>
    </>,
    document.body,
  );
}
