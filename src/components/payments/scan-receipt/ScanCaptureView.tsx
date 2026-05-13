import { useRef } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onFile: (file: File) => void;
}

export function ScanCaptureView({ onFile }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  const corner = (pos: string) => (
    <span className={`absolute ${pos} h-6 w-6`} style={{ borderColor: '#F47A19' }}>
      <span className="absolute inset-0" />
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <h2 className="text-xl font-semibold tracking-tight">Align the receipt.</h2>

      <div className="relative w-full aspect-[3/4] max-h-[55vh] rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
        {/* Corner brackets */}
        <span className="absolute top-3 left-3 h-7 w-7 border-t-[3px] border-l-[3px] rounded-tl-md" style={{ borderColor: '#F47A19' }} />
        <span className="absolute top-3 right-3 h-7 w-7 border-t-[3px] border-r-[3px] rounded-tr-md" style={{ borderColor: '#F47A19' }} />
        <span className="absolute bottom-3 left-3 h-7 w-7 border-b-[3px] border-l-[3px] rounded-bl-md" style={{ borderColor: '#F47A19' }} />
        <span className="absolute bottom-3 right-3 h-7 w-7 border-b-[3px] border-r-[3px] rounded-br-md" style={{ borderColor: '#F47A19' }} />

        <div className="absolute inset-0 flex items-center justify-center">
          <Camera className="h-12 w-12 text-white/20" />
        </div>
      </div>

      <div className="flex w-full gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => cameraRef.current?.click()}
          className="flex-1 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Camera className="h-4 w-4" /> Take Photo
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => libRef.current?.click()}
          className="flex-1 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <ImagePlus className="h-4 w-4" /> Upload
        </motion.button>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <input ref={libRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}
