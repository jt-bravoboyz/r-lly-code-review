import { motion } from 'framer-motion';

interface Props {
  imageUrl: string;
  error?: string | null;
  onRetry?: () => void;
  onManual?: () => void;
}

export function ScanProcessingView({ imageUrl, error, onRetry, onManual }: Props) {
  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <h2 className="text-xl font-semibold tracking-tight">
        {error ? "We couldn't read this one." : 'Scanning...'}
      </h2>

      <div className="relative w-full aspect-[3/4] max-h-[55vh] rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
        <img src={imageUrl} alt="Receipt" className="absolute inset-0 w-full h-full object-contain" />
        {!error && (
          <motion.div
            initial={{ y: '-10%' }}
            animate={{ y: '110%' }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-0 right-0 h-[2px] pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #F47A19 50%, transparent 100%)',
              boxShadow: '0 0 16px 2px #F47A19',
            }}
          />
        )}
      </div>

      {error && (
        <div className="flex w-full gap-3">
          <button
            onClick={onRetry}
            className="flex-1 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-sm font-semibold"
          >
            Retry
          </button>
          <button
            onClick={onManual}
            className="flex-1 h-12 rounded-2xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#F47A19' }}
          >
            Add Manually
          </button>
        </div>
      )}
    </div>
  );
}
