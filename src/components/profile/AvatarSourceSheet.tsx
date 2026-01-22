import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Camera, ImageIcon, X } from 'lucide-react';

interface AvatarSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCameraClick: () => void;
  onGalleryClick: () => void;
}

export function AvatarSourceSheet({
  open,
  onOpenChange,
  onCameraClick,
  onGalleryClick,
}: AvatarSourceSheetProps) {
  const handleCameraClick = () => {
    onOpenChange(false);
    // Small delay to let the drawer close before opening camera
    setTimeout(() => onCameraClick(), 150);
  };

  const handleGalleryClick = () => {
    onOpenChange(false);
    // Small delay to let the drawer close before opening gallery
    setTimeout(() => onGalleryClick(), 150);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center">
          <DrawerTitle>Change Profile Photo</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-3">
          <Button
            variant="outline"
            className="w-full h-14 justify-start gap-4 text-base"
            onClick={handleCameraClick}
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Take Photo</div>
              <div className="text-xs text-muted-foreground">Use your camera</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 justify-start gap-4 text-base"
            onClick={handleGalleryClick}
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Choose from Gallery</div>
              <div className="text-xs text-muted-foreground">Select an existing photo</div>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
