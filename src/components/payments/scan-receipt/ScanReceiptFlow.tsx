import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScanCaptureView } from './ScanCaptureView';
import { ScanProcessingView } from './ScanProcessingView';
import { ScanItemSelectView } from './ScanItemSelectView';
import type { ScannedReceipt, ScanCompletePayload } from './scanReceiptTypes';

interface Props {
  eventId: string;
  draftId: string;
  onComplete: (payload: ScanCompletePayload) => void;
  onAddManually: () => void;
}

type Stage = 'capture' | 'processing' | 'select';

async function compressImage(file: File, maxWidth = 1024, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('compress_failed')), 'image/jpeg', quality);
  });
}

export function ScanReceiptFlow({ eventId, draftId, onComplete, onAddManually }: Props) {
  const [stage, setStage] = useState<Stage>('capture');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ScannedReceipt | null>(null);

  const runScan = async (file: File) => {
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setStage('processing');
    try {
      const blob = await compressImage(file);
      const path = `${eventId}/${draftId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('receipts').createSignedUrl(path, 60 * 60);
      const url = signed?.signedUrl;
      if (!url) throw new Error('signed_url_failed');

      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000));
      const callP = supabase.functions.invoke('scan-receipt-vision', { body: { image_url: url } });
      const { data, error: fnErr } = (await Promise.race([callP, timeoutP])) as any;
      if (fnErr || (data as any)?.error) throw new Error((data as any)?.error ?? fnErr?.message ?? 'scan_failed');

      const r = data as ScannedReceipt;
      if (!r.items?.length) throw new Error('no_items');
      setReceipt(r);
      setStage('select');
    } catch (e: any) {
      setError(e?.message ?? 'scan_failed');
    }
  };

  if (stage === 'capture') return <ScanCaptureView onFile={runScan} />;
  if (stage === 'processing' || error) {
    return (
      <ScanProcessingView
        imageUrl={previewUrl}
        error={error}
        onRetry={() => { setError(null); setStage('capture'); }}
        onManual={onAddManually}
      />
    );
  }
  if (receipt) return <ScanItemSelectView receipt={receipt} onSend={onComplete} />;
  return null;
}
