import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, Beer } from 'lucide-react';

interface OnboardingSlide {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: <Sparkles className="h-16 w-16 text-white" strokeWidth={1.5} />,
    title: "Spontaneous Hangouts",
    description: "Create and join events on the fly with friends nearby"
  },
  {
    icon: <MapPin className="h-16 w-16 text-white" strokeWidth={1.5} />,
    title: "Real-time Coordination",
    description: "Chat, share locations, and keep everyone in the loop"
  },
  {
    icon: <Beer className="h-16 w-16 text-white" strokeWidth={1.5} />,
    title: "Bar Hopping & More",
    description: "Plan multi-stop events with ease and keep track of your crew"
  }
];

export function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Mark onboarding as complete
      localStorage.setItem('rally-onboarding-complete', 'true');
      navigate('/auth');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('rally-onboarding-complete', 'true');
    navigate('/auth');
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-rally-cream flex flex-col relative overflow-hidden">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={handleSkip}
          className="text-primary font-medium text-sm px-3 py-1.5 hover:opacity-80 transition-opacity"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
        {/* Icon circle */}
        <div className="relative mb-8">
          {/* Circle with icon */}
          <div className="w-64 h-64 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-xl relative overflow-hidden">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 rounded-full" />
            {/* Icon */}
            <div className="relative z-10">
              {slide.icon}
            </div>
          </div>
        </div>

        {/* Text content */}
        <div className="text-center max-w-xs">
          <h2 className="text-xl font-semibold text-rally-dark mb-3 font-montserrat">
            {slide.title}
          </h2>
          <p className="text-rally-gray text-sm leading-relaxed font-montserrat">
            {slide.description}
          </p>
        </div>

        {/* Pagination dots */}
        <div className="flex items-center gap-2 mt-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-6 bg-primary' 
                  : 'w-2 bg-rally-light-accent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom button */}
      <div className="p-8 pb-12">
        <Button
          onClick={handleNext}
          className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-medium text-base shadow-lg font-montserrat"
        >
          {isLastSlide ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
