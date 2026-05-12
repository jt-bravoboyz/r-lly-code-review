import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedReceipt {
  items: { description: string; quantity: number; unit_price_cents: number; confidence?: number }[];
  subtotal_cents: number;
  tax_cents: number;
  tip_cents: number;
  total_cents: number;
  image_url: string;
}

interface Props {
  eventId: string;
  draftId: string;
  currentImageUrl?: string | null;
  onParsed: (r: ParsedReceipt) => void;
  rescan?: boolean;
}

export function ReceiptUploader({ eventId, draftId, currentImageUrl, onParsed, rescan }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const path = `${eventId}/${draftId}/${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`;
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('receipts').createSignedUrl(path, 60 * 60);
      const url = signed?.signedUrl;
      if (!url) throw new Error('Could not create signed URL');

      const { data, error } = await supabase.functions.invoke('parse-receipt', { body: { image_url: url } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message ?? 'OCR failed');

      onParsed({ ...(data as any), image_url: url });
      toast.success(rescan ? 'Receipt re-scanned — items updated.' : 'Receipt parsed.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to parse receipt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {currentImageUrl ? (
        <div className="relative">
          <img src={currentImageUrl} alt="Receipt" className="w-full max-h-48 object-contain rounded-lg bg-muted" />
          <Button type="button" size="sm" variant="secondary" className="absolute top-2 right-2"
            onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Re-scan Receipt
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full h-24 flex flex-col gap-1" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          <span className="text-xs">{busy ? 'Parsing…' : 'Upload receipt photo'}</span>
        </Button>
      )}
    </div>
  );
}
