import { useEffect, useState, useCallback } from 'react';
import { useTutorial } from '@/hooks/useTutorial';
import { Button } from '@/components/ui/button';
import { ChevronRight, X, Target, Shield } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export function TutorialOverlay() {
  const { 
    isActive, 
    currentStep, 
    currentStepIndex, 
    totalSteps, 
    completeAction, 
    skipTutorial 
  } = useTutorial();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !currentStep?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(currentStep.targetSelector!);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      }
    };

    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', findTarget);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', findTarget);
    };
  }, [isActive, currentStep]);

  // Handle navigation steps
  useEffect(() => {
    if (!currentStep?.targetRoute) return;
    
    if (location.pathname === currentStep.targetRoute) {
      completeAction('navigate');
    }
  }, [location.pathname, currentStep, completeAction]);

  // Handle click on highlighted element
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (!currentStep?.targetSelector) return;

    const target = document.querySelector(currentStep.targetSelector);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const isClickInTarget = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );

    if (isClickInTarget) {
      // Trigger the actual click
      (target as HTMLElement).click();
      
      if (currentStep.requiredAction === 'tap') {
        completeAction('tap', currentStep.targetSelector);
      }
    }
  }, [currentStep, completeAction]);

  if (!isActive || !currentStep) return null;

  const progress = ((currentStepIndex + 1) / totalSteps) * 100;
  const isCompletionStep = currentStep.requiredAction === 'complete';
  const positionClass = currentStep.position === 'top' 
    ? 'top-20' 
    : currentStep.position === 'bottom' 
      ? 'bottom-32' 
      : 'top-1/2 -translate-y-1/2';

  return (
    <div className="fixed inset-0 z-[100]" onClick={handleOverlayClick}>
      {/* Dark overlay with cutout for target */}
      <div className="absolute inset-0 bg-black/80">
        {targetRect && (
          <div
            className="absolute bg-transparent border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] animate-pulse"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          >
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 border-2 border-primary rounded-lg animate-ping opacity-50" />
          </div>
        )}
      </div>

      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          skipTutorial();
        }}
        className="absolute top-4 right-4 text-white/60 hover:text-white p-2 z-10 flex items-center gap-1 text-sm"
      >
        <X className="h-4 w-4" />
        <span>Skip Training</span>
      </button>

      {/* Progress bar */}
      <div className="absolute top-4 left-4 right-20 h-2 bg-white/20 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="absolute top-7 left-4 text-white/60 text-xs font-mono">
        STEP {currentStepIndex + 1}/{totalSteps}
      </div>

      {/* Command card */}
      <div 
        className={`absolute left-4 right-4 ${positionClass} pointer-events-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="rounded-2xl p-6 border shadow-2xl max-w-md mx-auto"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
            borderColor: 'rgba(255, 106, 0, 0.3)',
          }}
        >
          {/* Mission badge */}
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)' }}
            >
              {currentStepIndex === totalSteps - 1 ? (
                <Shield className="h-4 w-4 text-white" />
              ) : (
                <Target className="h-4 w-4 text-white" />
              )}
            </div>
            <span 
              className="text-xs font-bold tracking-widest"
              style={{ color: '#FF6A00' }}
            >
              {currentStep.command}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-3 font-montserrat">
            {currentStep.title}
          </h2>

          {/* Instruction */}
          <p className="text-white/70 mb-6 leading-relaxed">
            {currentStep.instruction}
          </p>

          {/* Action button for completion steps */}
          {isCompletionStep && (
            <Button
              onClick={() => completeAction('complete')}
              className="w-full h-12 rounded-full font-bold text-base group transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)',
                color: '#FFFFFF',
              }}
            >
              {currentStepIndex === totalSteps - 1 ? 'BEGIN MISSION' : 'CONTINUE'}
              <ChevronRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}

          {/* CTA button for steps that have one */}
          {currentStep.ctaButton && (
            <Button
              onClick={() => {
                navigate(currentStep.ctaButton!.route);
                completeAction('complete');
              }}
              variant="outline"
              className="w-full h-10 rounded-full font-bold text-sm mt-3 border-white/30 text-white hover:bg-white/10"
            >
              {currentStep.ctaButton.label}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {/* Target hint for action steps */}
          {!isCompletionStep && currentStep.targetSelector && (
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Locate and tap the highlighted element</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
