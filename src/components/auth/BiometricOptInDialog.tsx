import { Fingerprint } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BiometricOptInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnable: () => void;
}

/**
 * Branded biometric opt-in prompt. Replaces the raw browser `confirm()` previously
 * used after a successful login/signup. R@lly Orange primary CTA, glass card framing.
 */
export function BiometricOptInDialog({ open, onOpenChange, onEnable }: BiometricOptInDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl">
        <AlertDialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-2">
            <Fingerprint className="h-7 w-7 text-primary" />
          </div>
          <AlertDialogTitle className="text-center font-montserrat text-xl">
            Skip the password next time?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Enable Face ID / Fingerprint to slide back into R@lly instantly. Nights move fast — your login should too.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-row gap-2">
          <AlertDialogCancel className="rounded-full">Not now</AlertDialogCancel>
          <AlertDialogAction
            onClick={onEnable}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold"
          >
            Enable
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
