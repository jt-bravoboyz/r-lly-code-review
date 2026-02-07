import { useState } from 'react';
import { Shield, MapPin, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SafetyChoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRallyGotMe: () => void;
  onDoingItMyself: () => void;
  isLoading?: boolean;
}

export function SafetyChoiceModal({
  open,
  onOpenChange,
  onRallyGotMe,
  onDoingItMyself,
  isLoading = false,
}: SafetyChoiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-sm" 
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold font-montserrat">
            How are you getting home tonight?
          </DialogTitle>
          <DialogDescription className="text-base">
            Plan ahead so you can focus on having fun.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <Button
            className="w-full h-14 text-base gradient-primary"
            onClick={onRallyGotMe}
            disabled={isLoading}
          >
            <Car className="h-5 w-5 mr-2" />
            R@lly got me
          </Button>
          
          <Button
            variant="outline"
            className="w-full h-14 text-base"
            onClick={onDoingItMyself}
            disabled={isLoading}
          >
            <MapPin className="h-5 w-5 mr-2" />
            I'm good
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          You can change this later in the Rally
        </p>
      </DialogContent>
    </Dialog>
  );
}
