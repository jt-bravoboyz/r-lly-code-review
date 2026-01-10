import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/hooks/useTutorial';
import { useConfetti } from '@/hooks/useConfetti';
import { 
  PartyPopper, 
  MapPin, 
  MessageCircle, 
  Navigation, 
  Car, 
  Home,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface FirstTimeWelcomeDialogProps {
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: MessageCircle,
    title: 'Group Chat',
    description: 'Chat with everyone at the rally in real-time',
  },
  {
    icon: Navigation,
    title: 'Live Tracking',
    description: 'See where your crew is and find them easily',
  },
  {
    icon: Car,
    title: 'Ride Coordination',
    description: 'Offer or request rides to the event',
  },
  {
    icon: Home,
    title: 'R@lly Home',
    description: 'Let friends know when you\'re heading out safe',
  },
];

export function FirstTimeWelcomeDialog({ 
  eventTitle, 
  isOpen, 
  onClose 
}: FirstTimeWelcomeDialogProps) {
  const { startTutorial } = useTutorial();
  const { fireRallyConfetti } = useConfetti();
  const [showFeatures, setShowFeatures] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);

  // Fire confetti when dialog opens
  useEffect(() => {
    if (isOpen && !confettiFired) {
      // Small delay to let dialog animate in
      const timer = setTimeout(() => {
        fireRallyConfetti();
        setConfettiFired(true);
      }, 200);
      return () => clearTimeout(timer);
    }
    
    // Reset confetti flag when dialog closes
    if (!isOpen) {
      setConfettiFired(false);
    }
  }, [isOpen, confettiFired, fireRallyConfetti]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowFeatures(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleStartTour = () => {
    onClose();
    // Small delay to let dialog close
    setTimeout(() => {
      startTutorial();
    }, 300);
  };

  const handleSkipTour = () => {
    onClose();
    // Mark as seen but don't force tutorial
    localStorage.setItem('rally-first-join-welcomed', 'true');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-md border-0 p-0 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
        }}
      >
        {/* Celebration Header */}
        <div 
          className="relative p-6 pb-4 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 106, 0, 0.2) 0%, rgba(255, 106, 0, 0.05) 100%)',
          }}
        >
          {/* Floating sparkles */}
          <div className="absolute top-4 left-8 animate-bounce delay-100">
            <Sparkles className="h-5 w-5 text-yellow-400 opacity-60" />
          </div>
          <div className="absolute top-6 right-12 animate-bounce delay-300">
            <Sparkles className="h-4 w-4 text-primary opacity-80" />
          </div>
          <div className="absolute bottom-4 left-12 animate-bounce delay-500">
            <Sparkles className="h-3 w-3 text-yellow-300 opacity-70" />
          </div>

          {/* Icon */}
          <div 
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)',
              boxShadow: '0 8px 32px rgba(255, 106, 0, 0.4)',
            }}
          >
            <PartyPopper className="h-10 w-10 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white font-montserrat mb-2">
            You're In! 🎉
          </h2>
          <p className="text-white/70">
            Welcome to <span className="text-primary font-semibold">{eventTitle}</span>
          </p>
        </div>

        {/* Features List */}
        <div className="p-6 space-y-4">
          <p className="text-white/60 text-sm text-center mb-4">
            Here's what you can do at this rally:
          </p>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  showFeatures 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 -translate-x-4'
                }`}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 106, 0, 0.2) 0%, rgba(255, 106, 0, 0.1) 100%)',
                  }}
                >
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{feature.title}</p>
                  <p className="text-white/50 text-xs">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-2 space-y-3">
          <Button
            onClick={handleStartTour}
            className="w-full h-12 rounded-xl font-bold text-base group transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)',
              color: '#FFFFFF',
              boxShadow: '0 8px 32px rgba(255, 106, 0, 0.35)',
            }}
          >
            <MapPin className="h-5 w-5 mr-2" />
            Take the Tour
            <ChevronRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkipTour}
            className="w-full h-10 text-white/50 hover:text-white/80 hover:bg-white/5"
          >
            I'll explore on my own
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}