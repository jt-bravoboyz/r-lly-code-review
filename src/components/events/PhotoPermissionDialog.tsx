import { useEffect, useRef, useState } from 'react';
import { Camera, Settings as SettingsIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  checkPhotoPermission,
  requestPhotoPermission,
  openAppSettings,
  type PhotoPermissionState,
} from '@/lib/photoPermissions';

type DialogMode = 'prompt' | 'denied';

interface InternalState {
  mode: DialogMode;
  resolve: (granted: boolean) => void;
}

let openController: ((s: InternalState | null) => void) | null = null;

/**
 * Imperative helper — call from anywhere to ensure photo-save permission.
 * Returns true when user can save (granted or web/no-op), false if denied.
 */
export async function ensurePhotoPermission(): Promise<boolean> {
  const status = await checkPhotoPermission();
  if (status === 'na' || status === 'granted') return true;

  if (!openController) {
    // Dialog isn't mounted — fall back to direct request
    const res = await requestPhotoPermission();
    return res === 'granted';
  }

  return new Promise<boolean>((resolve) => {
    openController!({
      mode: status === 'denied' ? 'denied' : 'prompt',
      resolve,
    });
  });
}

/** Mount once near the app root (or inside any feature that uses ensurePhotoPermission). */
export function PhotoPermissionDialog() {
  const [state, setState] = useState<InternalState | null>(null);
  const stateRef = useRef<InternalState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    openController = setState;
    return () => {
      openController = null;
    };
  }, []);

  const close = (granted: boolean) => {
    const cur = stateRef.current;
    if (cur) cur.resolve(granted);
    setState(null);
  };

  const handleAllow = async () => {
    if (!state) return;
    if (state.mode === 'denied') {
      await openAppSettings();
      // We can't know if they enabled it; resolve false so caller can re-prompt later
      close(false);
      return;
    }
    const res = await requestPhotoPermission();
    close(res === 'granted');
  };

  const isOpen = state !== null;
  const isDenied = state?.mode === 'denied';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {isDenied ? 'Enable Photos Access' : 'Save to Your Camera Roll'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isDenied
              ? 'Photos access is currently off. Open Settings to enable it so R@lly can save photos to your library.'
              : "R@lly needs permission to save photos to your library. Your photos stay on your device — we don't access your existing camera roll."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse sm:flex-col-reverse gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => close(false)} className="w-full">
            Not Now
          </Button>
          <Button onClick={handleAllow} className="w-full gap-2">
            {isDenied ? <><SettingsIcon className="h-4 w-4" /> Open Settings</> : 'Allow Access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
