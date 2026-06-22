import { useEffect, useState } from 'react';

/**
 * Detects whether the on-screen keyboard is open by watching visualViewport.
 * Falls back to focus tracking on text inputs when visualViewport is unavailable.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (vv) {
      const handle = () => {
        // Keyboard considered open when visual viewport shrinks meaningfully
        const ratio = vv.height / window.innerHeight;
        setOpen(ratio < 0.85);
      };
      handle();
      vv.addEventListener('resize', handle);
      vv.addEventListener('scroll', handle);
      return () => {
        vv.removeEventListener('resize', handle);
        vv.removeEventListener('scroll', handle);
      };
    }

    // Fallback: focus-based detection on form inputs
    const isTextInput = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'TEXTAREA') return true;
      if (tag === 'INPUT') {
        const type = (el as HTMLInputElement).type;
        return !['button', 'submit', 'checkbox', 'radio', 'file', 'range', 'color'].includes(type);
      }
      return el.isContentEditable;
    };
    const onFocus = (e: FocusEvent) => { if (isTextInput(e.target)) setOpen(true); };
    const onBlur = (e: FocusEvent) => { if (isTextInput(e.target)) setOpen(false); };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
    };
  }, []);

  return open;
}
