import { useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(true);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || !canInstall || !showPrompt) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      const installed = await promptInstall();
      if (installed) {
        setShowPrompt(false);
      }
    }
  };

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-gradient-to-r from-primary to-primary/90 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold font-montserrat text-sm">Install R@lly</p>
              <p className="text-white/80 text-xs">Add to home screen for the best experience</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              className="bg-white text-primary hover:bg-white/90 font-montserrat font-bold"
              onClick={handleInstall}
            >
              Install
            </Button>
            <button 
              onClick={() => setShowPrompt(false)}
              className="text-white/60 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-montserrat">Install R@lly on iOS</DialogTitle>
            <DialogDescription>
              Follow these steps to add R@lly to your home screen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Look for the <Share className="h-4 w-4" /> icon at the bottom of Safari
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">Select "Add to Home Screen"</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Tap <Plus className="h-4 w-4" /> Add to Home Screen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">Tap "Add"</p>
                <p className="text-sm text-muted-foreground">
                  R@lly will appear on your home screen
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowIOSModal(false)} className="w-full">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}