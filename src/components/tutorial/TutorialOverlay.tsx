import { useEffect, useState, useCallback } from 'react';
import { useTutorial } from '@/hooks/useTutorial';
import { Button } from '@/components/ui/button';
import { ChevronRight, X, Target, Shield } from 'lucide-react';
import { SafetyDashboardPreview } from './SafetyDashboardPreview';
import InsideRallyPreview from './InsideRallyPreview';
import SplitCheckPreview from './SplitCheckPreview';
import { TutorialSpotlightPortal } from './TutorialSpotlightPortal';

import { LiveStatusPreview } from './LiveStatusPreview';
import { BadgeLadderPreview } from './BadgeLadderPreview';
import { useLocation, useNavigate } from 'react-router-dom';

export function TutorialOverlay() {
  const { 
    isActive, 
    currentStep, 
    currentStepIndex, 
    totalSteps, 
    completeAction, 
    skipTutorial,
    endTutorial,
    startTutorial
  } = useTutorial();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Find and highlight target element
  useEffect(() => {
    setTargetMissing(false);
    // For create-rally, fall back to the first scan target so the spotlight ring renders
    // over the Create Event card and visibly lifts it above the dark backdrop.
    const selector =
      currentStep?.targetSelector ??
      (currentStep?.id === 'create-rally' ? currentStep?.scanTargets?.[0] : undefined);
    if (!isActive || !selector) {
      setTargetRect(null);
      return;
    }

    const isCreateRally = currentStep?.id === 'create-rally';
    let didScroll = false;
    const findTarget = () => {
      const target = document.querySelector(selector);
      if (target) {
        // For create-rally the page is already scrolled to top by the route effect —
        // centering pushes the card behind the coach modal, so skip scrollIntoView.
        if (!didScroll && !isCreateRally) {
          didScroll = true;
          (target as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
          setTimeout(() => {
            const t = document.querySelector(selector);
            if (t) setTargetRect(t.getBoundingClientRect());
          }, 350);
        }
        setTargetRect(target.getBoundingClientRect());
        setTargetMissing(false);
      } else {
        setTargetRect(null);
      }
    };

    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget, true);

    const missingTimer = setTimeout(() => {
      if (!document.querySelector(selector)) {
        setTargetMissing(true);
      }
    }, 2500);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget, true);
      clearTimeout(missingTimer);
    };
  }, [isActive, currentStep]);

  // Elevate any spotlighted target above the dim overlay (z-index lift)
  // for the entire duration of the step. Applies whenever a step has a
  // targetSelector — separate from the hero-mode glow which is keyed off
  // scanTargets. Re-applies on a 200ms interval to survive remounts.
  useEffect(() => {
    if (!isActive || !currentStep?.targetSelector) return;
    const sel = currentStep.targetSelector;
    const apply = () => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el && !el.classList.contains('rally-tutorial-spotlight')) {
        el.classList.add('rally-tutorial-spotlight');
      }
    };
    apply();
    const intervalId = setInterval(apply, 200);
    return () => {
      clearInterval(intervalId);
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) el.classList.remove('rally-tutorial-spotlight');
    };
  }, [isActive, currentStep]);

  // Handle navigation steps
  useEffect(() => {
    if (!currentStep?.targetRoute) return;

    if (currentStep.requiredAction === 'complete') {
      // Auto-navigate INTO the route on step entry, but only if not already there
      if (location.pathname !== currentStep.targetRoute) {
        navigate(currentStep.targetRoute);
      }
      // Scroll to top after the route renders, so scan targets are in view
      const scrollTimer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 120);
      return () => clearTimeout(scrollTimer);
    }

    if (location.pathname === currentStep.targetRoute) {
      completeAction('navigate');
    }
  }, [location.pathname, currentStep, completeAction, navigate]);

  // Sequential scan highlight across real DOM targets (e.g., bottom nav)
  // OR persistent hero highlight for single-target steps (e.g., Create Event)
  useEffect(() => {
    if (!isActive || !currentStep?.scanTargets?.length) return;
    const selectors = currentStep.scanTargets;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const getEl = (sel: string) => document.querySelector(sel) as HTMLElement | null;

    // HERO MODE: single target stays elevated above the dim overlay
    // for the entire duration of the step (no 3s cutoff).
    if (selectors.length === 1) {
      const sel = selectors[0];
      const apply = () => {
        const el = getEl(sel);
        if (el && !el.classList.contains('rally-tutorial-spotlight')) {
          el.classList.add('rally-tutorial-spotlight');
        }
      };
      apply();
      // Re-apply continuously so the class survives any remount of the target
      const intervalId = setInterval(apply, 200);
      return () => {
        timeouts.forEach(clearTimeout);
        clearInterval(intervalId);
        const el = getEl(sel);
        if (el) el.classList.remove('rally-tutorial-spotlight');
      };
    }

    // SEQUENTIAL SCAN MODE: multi-target nav scan
    const HIGHLIGHT_MS = 800;
    const START_DELAY = 300;
    const clearAll = () => {
      selectors.forEach((sel) => {
        const el = getEl(sel);
        if (el) {
          el.classList.remove('rally-scan-highlight');
          el.classList.remove('rally-scan-settled');
        }
      });
    };

    selectors.forEach((sel, i) => {
      const startAt = START_DELAY + i * HIGHLIGHT_MS;
      timeouts.push(setTimeout(() => {
        const el = getEl(sel);
        if (el) el.classList.add('rally-scan-highlight');
      }, startAt));
      timeouts.push(setTimeout(() => {
        const el = getEl(sel);
        if (el) el.classList.remove('rally-scan-highlight');
      }, startAt + HIGHLIGHT_MS));
    });

    const settleAt = START_DELAY + selectors.length * HIGHLIGHT_MS;
    timeouts.push(setTimeout(() => {
      selectors.forEach((sel) => {
        const el = getEl(sel);
        if (el) el.classList.add('rally-scan-settled');
      });
    }, settleAt));

    return () => {
      timeouts.forEach(clearTimeout);
      clearAll();
    };
  }, [isActive, currentStep]);


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

  const handleReplayBriefing = () => {
    endTutorial();
    setTimeout(() => {
      startTutorial();
    }, 300);
  };

  if (!isActive || !currentStep) return null;

  const progress = ((currentStepIndex + 1) / totalSteps) * 100;
  const isCompletionStep = currentStep.requiredAction === 'complete';
  const isCreateRally = currentStep.id === 'create-rally';
  const positionClass = currentStep.position === 'top' 
    ? 'top-20' 
    : currentStep.position === 'bottom' 
      ? 'bottom-32' 
      : currentStep.position === 'above-nav'
        ? (isCreateRally ? 'bottom-24' : 'bottom-[100px]')
        : 'top-1/2 -translate-y-1/2';
  const hasScan = !!currentStep.scanTargets?.length;

  // Selector used for the portal-based spotlight clone. Falls back to the
  // single scanTarget for create-rally (hero mode) so any spotlighted step
  // gets a clean foreground render.
  const spotlightSelector =
    currentStep.targetSelector ??
    (currentStep.scanTargets?.length === 1 ? currentStep.scanTargets[0] : undefined);
  const isNavTarget = spotlightSelector?.startsWith('[data-tutorial="nav-');
  const usePortalSpotlight = !!spotlightSelector && !isNavTarget;

  return (
    <div className="fixed inset-0 z-[50]" onClick={handleOverlayClick}>
      {/* Dark overlay (no in-overlay ring when using portal — the portal
          renders its own ring above the dim, escaping stacking contexts) */}
      <div className={`absolute inset-0 bg-black/80 ${currentStep.id === 'create-rally' ? 'rally-backdrop-deep' : ''}`}>
        {!usePortalSpotlight && targetRect && !isNavTarget && (() => {
          const pad = 8;
          const margin = 16;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const width = targetRect.width + pad * 2;
          const height = targetRect.height + pad * 2;
          let left = targetRect.left - pad;
          let top = targetRect.top - pad;
          left = Math.max(margin, Math.min(left, vw - width - margin));
          top = Math.max(margin, Math.min(top, vh - height - margin));
          return (
            <>
              <div
                className="absolute pointer-events-none rounded-2xl"
                style={{
                  left: left - 32,
                  top: top - 32,
                  width: width + 64,
                  height: height + 64,
                  background:
                    'radial-gradient(circle, rgba(244,122,25,0.45) 0%, rgba(244,122,25,0.15) 45%, transparent 70%)',
                  filter: 'blur(16px)',
                  animation: 'tutorial-breathe 1.8s ease-in-out infinite',
                }}
              />
              <div
                className="absolute bg-transparent border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.8)]"
                style={{
                  left,
                  top,
                  width,
                  height,
                  boxShadow:
                    '0 0 0 9999px rgba(0,0,0,0.85), 0 0 28px 6px rgba(244,122,25,0.95), inset 0 0 24px 4px rgba(255,200,140,0.75)',
                  animation: 'tutorial-breathe 1.8s ease-in-out infinite',
                }}
              >
                {!isCreateRally && (
                  <>
                    <div
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle at center, rgba(255,240,200,0.85) 0%, rgba(244,122,25,0.55) 40%, rgba(244,122,25,0.15) 70%, transparent 100%)',
                        mixBlendMode: 'screen',
                        animation: 'tutorial-breathe 1.8s ease-in-out infinite',
                      }}
                    />
                    <div className="absolute inset-0 border-2 border-primary rounded-lg animate-ping opacity-60" />
                  </>
                )}
              </div>
              <style>{`@keyframes tutorial-breathe {
                0%, 100% { opacity: 0.9; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.03); }
              }`}</style>
            </>
          );
        })()}
      </div>

      {/* Portal-based spotlight: renders a clone of the target at document.body
          so it escapes every parent stacking context and lands fully above the
          dim overlay at full brightness. */}
      {usePortalSpotlight && spotlightSelector && (
        <TutorialSpotlightPortal
          selector={spotlightSelector}
          interactive={currentStep.requiredAction === 'tap'}
          onTap={() => {
            if (currentStep.requiredAction === 'tap') {
              completeAction('tap', spotlightSelector);
            }
          }}
        />
      )}




      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          skipTutorial();
        }}
        className="absolute top-12 right-4 text-white/60 hover:text-white p-2 z-10 flex items-center gap-1 text-sm"
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
          className={`rounded-2xl border shadow-2xl max-w-md mx-auto ${isCreateRally ? 'p-4' : 'p-6'}`}
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
            borderColor: 'rgba(255, 106, 0, 0.3)',
          }}
        >
          {/* Mission badge */}
          <div className={`flex items-center gap-2 ${isCreateRally ? 'mb-2' : 'mb-3'}`}>
            <div 
              className={`${isCreateRally ? 'w-7 h-7' : 'w-8 h-8'} rounded-full flex items-center justify-center`}
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
          <h2 className={`font-bold text-white font-montserrat ${isCreateRally ? 'text-base mb-1.5' : 'text-xl mb-3'}`}>
            {currentStep.title}
          </h2>

          {/* Instruction */}
          <p className={`text-white/70 leading-relaxed ${isCreateRally ? 'text-sm mb-3' : 'mb-4'}`}>
            {currentStep.instruction}
          </p>

          {/* Inline illustration mockups */}
          {currentStep.illustration === 'safety-dashboard' && <SafetyDashboardPreview />}
          {currentStep.illustration === 'inside-rally' && <InsideRallyPreview />}
          {currentStep.illustration === 'split-check' && <SplitCheckPreview />}

          {/* Action button for completion steps */}
          {isCompletionStep && (
            <>
              <Button
                onClick={() => completeAction('complete')}
                className={`w-full rounded-full font-bold group transition-all duration-300 ${isCreateRally ? 'h-10 text-sm' : 'h-12 text-base'}`}
                style={{
                  background: 'linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)',
                  color: '#FFFFFF',
                }}
              >
                {currentStep.id === 'graduation' ? "LET'S R@LLY" : 'CONTINUE'}
                <ChevronRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
              {currentStep.id === 'graduation' && (
                <button
                  onClick={handleReplayBriefing}
                  className="w-full mt-3 py-2.5 rounded-xl border border-white/15 bg-white/[0.03] text-[12px] font-semibold tracking-wide text-white/60 hover:bg-white/5 hover:text-white/80 transition-all duration-200"
                >
                  Replay Briefing
                </button>
              )}
            </>
          )}

          {/* CTA button for steps that have one */}
          {currentStep.ctaButton && (
            <Button
              onClick={() => {
                navigate(currentStep.ctaButton!.route);
                // Let user view the page briefly, then end tutorial
                setTimeout(() => {
                  skipTutorial();
                }, 600);
              }}
              variant="outline"
              className="w-full h-10 rounded-full font-bold text-sm mt-3 border-white/30 text-white hover:bg-white/10"
            >
              {currentStep.ctaButton.label}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {/* Target hint for action steps */}
          {!isCompletionStep && currentStep.targetSelector && !targetMissing && (
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Locate and tap the highlighted element</span>
            </div>
          )}

          {/* Fallback when the target element can't be found */}
          {!isCompletionStep && currentStep.targetSelector && targetMissing && (
            <Button
              onClick={() => completeAction(currentStep.requiredAction)}
              className="w-full h-12 rounded-full font-bold text-base mt-2"
              style={{
                background: 'linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)',
                color: '#FFFFFF',
              }}
            >
              CONTINUE
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
