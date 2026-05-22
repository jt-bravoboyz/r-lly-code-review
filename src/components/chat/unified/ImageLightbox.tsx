import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  src: string;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <button
        className="absolute right-6 h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
        style={{ top: 'max(env(safe-area-inset-top), 1.5rem)' }}
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt=""
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl"
        style={{ touchAction: 'pinch-zoom' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
