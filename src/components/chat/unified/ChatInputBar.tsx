import { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceDictationButton } from './VoiceDictationButton';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onTyping?: () => void;
  onPickImage: (file: File) => void;
  imagePreview: string | null;
  onClearImage: () => void;
  disabled?: boolean;
  sending?: boolean;
}

export function ChatInputBar({
  value,
  onChange,
  onSend,
  onTyping,
  onPickImage,
  imagePreview,
  onClearImage,
  disabled,
  sending,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = 22;
    const maxLines = 5;
    ta.style.height = Math.min(ta.scrollHeight, lineHeight * maxLines + 16) + 'px';
  }, [value]);

  const hasContent = value.trim().length > 0 || !!imagePreview;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasContent && !disabled) onSend();
    }
  };

  return (
    <div
      className="relative px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] border-t border-border/40 bg-background/70 dark:bg-background/60 backdrop-blur-xl"
      style={{
        boxShadow: '0 -8px 24px -16px rgba(0,0,0,0.25)',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-[breath_4s_ease-in-out_infinite]" />

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraRef}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickImage(f);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={galleryRef}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickImage(f);
          e.target.value = '';
        }}
      />

      {imagePreview && (
        <div className="px-1 pb-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-20 object-cover rounded-xl ring-1 ring-border/60"
            />
            <button
              type="button"
              onClick={onClearImage}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center shadow-md"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-11 w-11 rounded-full text-muted-foreground"
          onClick={() => cameraRef.current?.click()}
          aria-label="Take photo"
        >
          <Camera className="h-6 w-6" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 rounded-full text-muted-foreground"
          onClick={() => galleryRef.current?.click()}
          aria-label="Pick photo"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            onChange={(e) => {
              onChange(e.target.value);
              if (e.target.value.trim()) onTyping?.();
            }}
            onKeyDown={onKey}
            placeholder={listening ? 'Listening…' : 'Message'}
            className={cn(
              'w-full resize-none px-4 py-2.5 rounded-2xl text-sm scrollbar-hide',
              'bg-foreground/[0.04] dark:bg-white/[0.06] border border-border/60',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40',
              'transition-all [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
            )}
            style={{ lineHeight: '22px' }}
          />
        </div>

        {!hasContent ? (
          <VoiceDictationButton
            onTranscript={(text, isFinal) => {
              if (isFinal) {
                onChange(value + (value ? ' ' : '') + text);
              }
            }}
            onListeningChange={setListening}
          />
        ) : (
          <Button
            type="button"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-md shadow-primary/30"
            onClick={onSend}
            disabled={disabled || sending}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
