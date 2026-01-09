import { useEffect, useState, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

type SplashPhase = "arc1" | "ready" | "arc2" | "set" | "fanfare" | "exit";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
}

// Haptic feedback utility
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }
};

export function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<SplashPhase>("arc1");
  const [arcProgress, setArcProgress] = useState(0);
  const [trailPoints, setTrailPoints] = useState<{ x: number; y: number; opacity: number }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [textScale, setTextScale] = useState(0.5);
  const animationRef = useRef<number>();

  // Calculate curved arc position (parabolic trajectory)
  const getArcPosition = (t: number, isSecondArc: boolean = false) => {
    const startY = isSecondArc ? 30 : 40; // Second arc starts higher
    const peakY = isSecondArc ? 20 : 30; // Peak of the arc
    const endY = isSecondArc ? 70 : 60; // Falls lower
    
    // X moves linearly with slight easing
    const x = t * 100;
    
    // Y follows a parabolic arc: rises then falls with gravity
    const peakT = 0.3; // Peak happens at 30% of the journey
    let y;
    if (t < peakT) {
      // Rising phase
      const riseProgress = t / peakT;
      y = startY - (startY - peakY) * Math.sin(riseProgress * Math.PI / 2);
    } else {
      // Falling phase with gravity acceleration
      const fallProgress = (t - peakT) / (1 - peakT);
      const gravityEase = fallProgress * fallProgress; // Accelerating fall
      y = peakY + (endY - peakY) * gravityEase;
    }
    
    return { x, y };
  };

  // Generate particles for fanfare
  const generateParticles = () => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 4;
      newParticles.push({
        id: i,
        x: 50,
        y: 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Initial upward bias
        opacity: 1,
        size: 2 + Math.random() * 4,
      });
    }
    return newParticles;
  };

  // Animate particles with gravity
  useEffect(() => {
    if (phase !== "fanfare" && phase !== "exit") return;
    
    let frame: number;
    const animate = () => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx * 0.3,
          y: p.y + p.vy * 0.3,
          vy: p.vy + 0.15, // Gravity
          opacity: Math.max(0, p.opacity - 0.02),
        })).filter(p => p.opacity > 0)
      );
      frame = requestAnimationFrame(animate);
    };
    
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    // Timings for ~3 second sequence
    const timings = {
      arc1Duration: 500,
      readyAt: 500,
      readyHold: 350,
      arc2At: 850,
      setAt: 1350,
      setHold: 350,
      fanfareAt: 1700,
      exitAt: 2700,
      completeAt: duration,
    };

    // Arc 1 animation
    let startTime = Date.now();
    const animateArc1 = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / timings.arc1Duration);
      
      // Ease-out for natural motion, speed up at the end
      const eased = 1 - Math.pow(1 - progress, 2);
      setArcProgress(eased);
      
      // Update trail
      const pos = getArcPosition(eased, false);
      setTrailPoints(prev => {
        const newTrail = [...prev, { x: pos.x, y: pos.y, opacity: 1 }]
          .slice(-20)
          .map((p, i, arr) => ({ ...p, opacity: (i + 1) / arr.length }));
        return newTrail;
      });
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateArc1);
      }
    };
    animationRef.current = requestAnimationFrame(animateArc1);

    const readyTimer = setTimeout(() => {
      setPhase("ready");
      setTrailPoints([]);
      setArcProgress(0);
      setTextScale(0.5);
      triggerHaptic();
      // Animate text scale
      let scale = 0.5;
      const scaleInterval = setInterval(() => {
        scale += 0.05;
        setTextScale(Math.min(1, scale));
        if (scale >= 1) clearInterval(scaleInterval);
      }, 20);
    }, timings.readyAt);

    const arc2Timer = setTimeout(() => {
      setPhase("arc2");
      setTextScale(0.5);
      startTime = Date.now();
      
      const animateArc2 = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / timings.arc1Duration);
        const eased = 1 - Math.pow(1 - progress, 2.5); // Faster fall
        setArcProgress(eased);
        
        const pos = getArcPosition(eased, true);
        setTrailPoints(prev => {
          const newTrail = [...prev, { x: pos.x, y: pos.y, opacity: 1 }]
            .slice(-25) // Longer trail
            .map((p, i, arr) => ({ ...p, opacity: (i + 1) / arr.length }));
          return newTrail;
        });
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateArc2);
        }
      };
      animationRef.current = requestAnimationFrame(animateArc2);
    }, timings.arc2At);

    const setTimer = setTimeout(() => {
      setPhase("set");
      setTrailPoints([]);
      setArcProgress(0);
      setTextScale(0.5);
      triggerHaptic();
      let scale = 0.5;
      const scaleInterval = setInterval(() => {
        scale += 0.06; // Slightly faster
        setTextScale(Math.min(1, scale));
        if (scale >= 1) clearInterval(scaleInterval);
      }, 20);
    }, timings.setAt);

    const fanfareTimer = setTimeout(() => {
      setPhase("fanfare");
      setParticles(generateParticles());
      triggerHaptic();
    }, timings.fanfareAt);

    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, timings.exitAt);

    const completeTimer = setTimeout(onComplete, timings.completeAt);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      clearTimeout(readyTimer);
      clearTimeout(arc2Timer);
      clearTimeout(setTimer);
      clearTimeout(fanfareTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  const currentArcPos = getArcPosition(arcProgress, phase === "arc2");

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ease-out overflow-hidden ${
        phase === "exit" ? "opacity-0 scale-110" : "opacity-100 scale-100"
      }`}
      style={{ backgroundColor: "#121212" }}
    >
      {/* Curved arc with trail */}
      {(phase === "arc1" || phase === "arc2") && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Trail segments */}
          {trailPoints.map((point, index) => (
            <circle
              key={index}
              cx={`${point.x}%`}
              cy={`${point.y}%`}
              r={phase === "arc2" ? 4 + index * 0.3 : 3 + index * 0.2}
              fill={`rgba(255, 106, 0, ${point.opacity * 0.6})`}
              style={{
                filter: `blur(${2 + (1 - point.opacity) * 3}px)`,
              }}
            />
          ))}
          
          {/* Main glowing orb */}
          <defs>
            <radialGradient id="orbGradient">
              <stop offset="0%" stopColor="#FFB347" />
              <stop offset="40%" stopColor="#FF8C00" />
              <stop offset="70%" stopColor="#FF6A00" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <circle
            cx={`${currentArcPos.x}%`}
            cy={`${currentArcPos.y}%`}
            r={phase === "arc2" ? 10 : 8}
            fill="url(#orbGradient)"
            filter="url(#glow)"
          />
          
          {/* Outer glow */}
          <circle
            cx={`${currentArcPos.x}%`}
            cy={`${currentArcPos.y}%`}
            r={phase === "arc2" ? 20 : 16}
            fill="none"
            stroke="rgba(255, 106, 0, 0.3)"
            strokeWidth="2"
            style={{ filter: "blur(8px)" }}
          />
        </svg>
      )}

      {/* READY text with scale forward */}
      {phase === "ready" && (
        <h1 
          className="font-montserrat font-extrabold text-5xl sm:text-6xl tracking-widest"
          style={{ 
            color: "rgba(255, 255, 255, 0.95)",
            transform: `scale(${textScale}) translateZ(0)`,
            textShadow: `0 0 ${30 * textScale}px rgba(255, 106, 0, 0.4)`,
            transition: "transform 0.05s ease-out",
          }}
        >
          READY
        </h1>
      )}

      {/* SET text with scale forward */}
      {phase === "set" && (
        <h1 
          className="font-montserrat font-extrabold text-5xl sm:text-6xl tracking-widest"
          style={{ 
            color: "rgba(255, 255, 255, 0.95)",
            transform: `scale(${textScale}) translateZ(0)`,
            textShadow: `0 0 ${30 * textScale}px rgba(255, 106, 0, 0.4)`,
            transition: "transform 0.05s ease-out",
          }}
        >
          SET
        </h1>
      )}

      {/* Logo reveal with particle fanfare */}
      {(phase === "fanfare" || phase === "exit") && (
        <>
          {/* Particle burst */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <radialGradient id="particleGradient">
                <stop offset="0%" stopColor="#FFB347" />
                <stop offset="60%" stopColor="#FF6A00" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            {particles.map(p => (
              <circle
                key={p.id}
                cx={`${p.x}%`}
                cy={`${p.y}%`}
                r={p.size}
                fill={`rgba(255, 106, 0, ${p.opacity})`}
                style={{ filter: "blur(1px)" }}
              />
            ))}
          </svg>

          {/* Orange pulse behind logo */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
          >
            <div 
              className="w-48 h-48 rounded-full animate-splash-pulse-once"
              style={{
                background: "radial-gradient(circle, rgba(255, 106, 0, 0.5) 0%, rgba(255, 106, 0, 0.15) 50%, transparent 70%)",
              }}
            />
          </div>
          
          {/* R@LLY wordmark */}
          <h1
            className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight animate-splash-logo-scale relative z-10"
            style={{ 
              color: "rgba(255, 255, 255, 0.95)",
              textShadow: "0 0 60px rgba(255, 106, 0, 0.5), 0 0 100px rgba(255, 106, 0, 0.3)",
            }}
          >
            R@LLY
          </h1>
          
          {/* Tagline */}
          <p
            className="absolute mt-28 text-lg font-medium tracking-wide animate-splash-tagline-fade"
            style={{ color: "rgba(255, 255, 255, 0.70)" }}
          >
            Rally your people.
          </p>
        </>
      )}
    </div>
  );
}
