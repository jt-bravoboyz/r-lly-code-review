import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, MapPin, Users, ChevronRight } from 'lucide-react';
import { PolicyAcceptanceDialog } from '@/components/legal/PolicyAcceptanceDialog';
import { useTutorial } from '@/hooks/useTutorial';

interface OnboardingSlide {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: <Zap className="h-12 w-12" strokeWidth={2} />,
    title: "Spontaneous Hangouts",
    description: "Create and join events on the fly with friends nearby"
  },
  {
    icon: <MapPin className="h-12 w-12" strokeWidth={2} />,
    title: "Real-time Coordination",
    description: "Chat, share locations, and keep everyone in the loop"
  },
  {
    icon: <Users className="h-12 w-12" strokeWidth={2} />,
    title: "Rally Your Squad",
    description: "Plan multi-stop events with ease and keep track of your crew"
  }
];

interface OnboardingProps {
  onComplete?: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const { startTutorial } = useTutorial();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Show policy acceptance dialog on last slide
      setShowPolicyDialog(true);
    }
  };

  const handlePolicyAccepted = () => {
    // Mark onboarding as complete and call callback
    localStorage.setItem('rally-onboarding-complete', 'true');
    onComplete?.();
    // Start the interactive tutorial after a short delay
    setTimeout(() => {
      startTutorial();
    }, 500);
  };

  const handleSkip = () => {
    // Still need to accept policies even when skipping
    setShowPolicyDialog(true);
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "#121212" }}
    >
      {/* Radial gradient glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center top, rgba(255, 106, 0, 0.15) 0%, rgba(255, 106, 0, 0.05) 40%, transparent 70%)",
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: "#FF6A00" }}
        />
        <div 
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: "#FF6A00" }}
        />
      </div>

      {/* Skip button */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={handleSkip}
          className="font-medium text-sm px-4 py-2 rounded-full transition-all duration-300 hover:bg-white/10"
          style={{ color: "rgba(255, 255, 255, 0.6)" }}
        >
          Skip
        </button>
      </div>

      {/* Hero Tagline Section */}
      <div className="pt-16 pb-8 px-8 text-center relative z-10">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span 
            className="text-2xl sm:text-3xl font-bold font-montserrat tracking-wide animate-onboard-word-1"
            style={{ color: "rgba(255, 255, 255, 0.90)" }}
          >
            Ready.
          </span>
          <span 
            className="text-2xl sm:text-3xl font-bold font-montserrat tracking-wide animate-onboard-word-2"
            style={{ color: "rgba(255, 255, 255, 0.90)" }}
          >
            Set.
          </span>
          <span 
            className="text-2xl sm:text-3xl font-extrabold font-montserrat tracking-wide animate-onboard-word-3"
            style={{ 
              background: "linear-gradient(135deg, #FF6A00 0%, #FF8C42 50%, #FFB366 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 40px rgba(255, 106, 0, 0.5)",
            }}
          >
            R@lly!
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        {/* Icon circle with glow */}
        <div className="relative mb-10">
          {/* Outer glow ring */}
          <div 
            className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse"
            style={{ 
              background: "radial-gradient(circle, #FF6A00 0%, transparent 70%)",
              transform: "scale(1.3)",
            }}
          />
          
          {/* Main circle */}
          <div 
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center relative overflow-hidden border transition-all duration-500"
            style={{ 
              backgroundColor: "#1E1E1E",
              borderColor: "rgba(255, 106, 0, 0.3)",
              boxShadow: "0 0 60px rgba(255, 106, 0, 0.2), inset 0 0 40px rgba(255, 106, 0, 0.05)",
            }}
          >
            {/* Inner gradient overlay */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                background: "radial-gradient(circle at 30% 30%, rgba(255, 106, 0, 0.4) 0%, transparent 60%)",
              }}
            />
            
            {/* Icon */}
            <div 
              className="relative z-10 transition-transform duration-300"
              style={{ color: "#FF6A00" }}
            >
              {slide.icon}
            </div>
          </div>
        </div>

        {/* Text content */}
        <div className="text-center max-w-sm">
          <h2 
            className="text-2xl sm:text-3xl font-bold mb-4 font-montserrat tracking-tight"
            style={{ color: "rgba(255, 255, 255, 0.95)" }}
          >
            {slide.title}
          </h2>
          <p 
            className="text-base sm:text-lg leading-relaxed font-montserrat"
            style={{ color: "rgba(255, 255, 255, 0.60)" }}
          >
            {slide.description}
          </p>
        </div>

        {/* Pagination dots */}
        <div className="flex items-center gap-3 mt-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 h-2' 
                  : 'w-2 h-2 hover:opacity-80'
              }`}
              style={{
                backgroundColor: index === currentSlide ? "#FF6A00" : "rgba(255, 255, 255, 0.25)",
                boxShadow: index === currentSlide ? "0 0 12px rgba(255, 106, 0, 0.5)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom button */}
      <div className="p-8 pb-12 relative z-10">
        <Button
          onClick={handleNext}
          className="w-full h-14 rounded-full font-bold text-lg shadow-2xl font-montserrat group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)",
            color: "#FFFFFF",
            boxShadow: "0 8px 32px rgba(255, 106, 0, 0.4), 0 0 0 1px rgba(255, 106, 0, 0.2)",
          }}
        >
          {isLastSlide ? "Get Started" : "Next"}
          <ChevronRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <PolicyAcceptanceDialog
        open={showPolicyDialog}
        onOpenChange={setShowPolicyDialog}
        onAccept={handlePolicyAccepted}
      />
    </div>
  );
}
