import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Props {
  checked: boolean;
  onChange: () => void;
}

export function ScanCheckbox({ checked, onChange }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full"
      whileTap={{ scale: 0.9 }}
      animate={{ scale: checked ? [0.9, 1.05, 1.0] : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18, duration: 0.25 }}
    >
      <motion.span
        className="h-7 w-7 rounded-full flex items-center justify-center"
        animate={{
          backgroundColor: checked ? '#F47A19' : 'rgba(255,255,255,0)',
          borderColor: checked ? '#F47A19' : 'rgba(255,255,255,0.3)',
          borderWidth: 1.5,
        }}
        transition={{ duration: 0.18 }}
        style={{ borderStyle: 'solid' }}
      >
        {checked && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
      </motion.span>
    </motion.button>
  );
}
