import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  onTranscript: (text: string, isFinal: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
}

export function VoiceDictationButton({ onTranscript, onListeningChange }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const SR =
      (typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    setSupported(!!SR);
  }, []);

  useEffect(() => {
    onListeningChange?.(listening);
  }, [listening, onListeningChange]);

  if (!supported) return null;

  const stop = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  };

  const start = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';

    rec.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) onTranscript(final, true);
      else if (interim) onTranscript(interim, false);

      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => stop(), 2000);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast.error('Mic access required for voice input.');
      }
      stop();
    };
    rec.onend = () => {
      setListening(false);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      stop();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`shrink-0 h-10 w-10 rounded-full transition-all ${
        listening ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
      }`}
      onClick={() => (listening ? stop() : start())}
      aria-label={listening ? 'Stop dictation' : 'Start voice input'}
    >
      <Mic
        className={`h-5 w-5 ${listening ? 'animate-pulse' : ''}`}
      />
      {listening && (
        <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping" />
      )}
    </Button>
  );
}
