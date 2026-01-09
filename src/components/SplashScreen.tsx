import { useEffect, useState, useRef, useCallback } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  lifetime: number;
  maxLifetime: number;
}

interface AfterImagePoint {
  x: number;
  y: number;
  opacity: number;
  createdAt: number;
}

interface FanfareParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
}

// Easing functions
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;

// Combined easing: EaseOut for first 40%, EaseIn for last 60%
const arcEasing = (t: number) => {
  if (t < 0.4) {
    return easeOutCubic(t / 0.4) * 0.4;
  } else {
    return 0.4 + easeInCubic((t - 0.4) / 0.6) * 0.6;
  }
};

// Quadratic bezier curve calculation
const getQuadraticBezierPoint = (
  t: number,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number }
) => {
  const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * control.x + Math.pow(t, 2) * end.x;
  const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * control.y + Math.pow(t, 2) * end.y;
  return { x, y };
};

// Arc paths - extended to ensure full screen coverage
const ARC1 = {
  start: { x: -30, y: 68 },
  control: { x: 40, y: 22 },
  end: { x: 130, y: 74 },
};

const ARC2 = {
  start: { x: -30, y: 46 },
  control: { x: 52, y: 10 },
  end: { x: 130, y: 82 },
};

// Third arc - circular orbit around logo
const ARC3_CENTER = { x: 50, y: 50 };
const ARC3_RADIUS = 18; // Percentage of screen

// Get circular orbit position
const getCircularOrbitPosition = (t: number, center: { x: number; y: number }, radius: number) => {
  // Start from top, go clockwise for 1.2 full rotations
  const angle = -Math.PI / 2 + t * Math.PI * 2.4;
  const x = center.x + Math.cos(angle) * radius;
  const y = center.y + Math.sin(angle) * radius * 0.6; // Slightly elliptical for perspective
  return { x, y };
};

// Haptic feedback
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }
};

export function SplashScreen({ onComplete, duration = 5000 }: SplashScreenProps) {
  const [startTime] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [afterImages, setAfterImages] = useState<AfterImagePoint[]>([]);
  const [fanfareParticles, setFanfareParticles] = useState<FanfareParticle[]>([]);
  const [hasTriggeredReady, setHasTriggeredReady] = useState(false);
  const [hasTriggeredSet, setHasTriggeredSet] = useState(false);
  const [hasTriggeredFanfare, setHasTriggeredFanfare] = useState(false);
  const frameRef = useRef<number>();
  const lastSparkTime = useRef(0);

  const elapsed = (currentTime - startTime) / 1000;

  // Generate sparks behind comet head
  const generateSparks = useCallback((x: number, y: number, vx: number, vy: number) => {
    const newSparks: Spark[] = [];
    const count = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(vy, vx) + Math.PI + (Math.random() - 0.5) * 1.2;
      const speed = 0.5 + Math.random() * 1.5;
      const lifetime = 250 + Math.random() * 150;
      newSparks.push({
        id: Date.now() + i + Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        opacity: 0.8 + Math.random() * 0.2,
        size: 1.5 + Math.random() * 2.5,
        lifetime: 0,
        maxLifetime: lifetime,
      });
    }
    return newSparks;
  }, []);

  // Generate fanfare particles
  const generateFanfareParticles = useCallback(() => {
    const particles: FanfareParticle[] = [];
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.4;
      const speed = 2 + Math.random() * 5;
      particles.push({
        id: i,
        x: 50,
        y: 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        opacity: 1,
        size: 2 + Math.random() * 5,
      });
    }
    return particles;
  }, []);

  // Main animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      setCurrentTime(now);

      // Update sparks
      setSparks(prev => 
        prev.map(s => ({
          ...s,
          x: s.x + s.vx,
          y: s.y + s.vy,
          lifetime: s.lifetime + 16,
          opacity: Math.max(0, s.opacity * 0.94),
        })).filter(s => s.lifetime < s.maxLifetime && s.opacity > 0.05)
      );

      // Update afterimages
      setAfterImages(prev =>
        prev.map(a => ({
          ...a,
          opacity: Math.max(0, a.opacity - 0.004),
        })).filter(a => a.opacity > 0)
      );

      // Update fanfare particles
      setFanfareParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.vx * 0.25,
          y: p.y + p.vy * 0.25,
          vy: p.vy + 0.12,
          opacity: Math.max(0, p.opacity - 0.015),
        })).filter(p => p.opacity > 0)
      );

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Trigger haptics and fanfare
  useEffect(() => {
    if (elapsed >= 0.55 && !hasTriggeredReady) {
      triggerHaptic();
      setHasTriggeredReady(true);
    }
    if (elapsed >= 2.35 && !hasTriggeredSet) {
      triggerHaptic();
      setHasTriggeredSet(true);
    }
    if (elapsed >= 3.55 && !hasTriggeredFanfare) {
      setFanfareParticles(generateFanfareParticles());
      triggerHaptic();
      setHasTriggeredFanfare(true);
    }
  }, [elapsed, hasTriggeredReady, hasTriggeredSet, hasTriggeredFanfare, generateFanfareParticles]);

  // Completion
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  // Calculate arc positions and generate effects
  const getArcState = (arcStartTime: number, arcDuration: number, arc: typeof ARC1, isSecondArc: boolean, isThirdArc: boolean = false) => {
    const arcElapsed = elapsed - arcStartTime;
    if (arcElapsed < 0 || arcElapsed > arcDuration + 0.8) return null;

    const t = Math.min(1, arcElapsed / arcDuration);
    const easedT = arcEasing(t);
    const headPos = getQuadraticBezierPoint(easedT, arc.start, arc.control, arc.end);

    // Tail lags behind
    const tailLag = isThirdArc ? 0.08 : (isSecondArc ? 0.11 : 0.11) / arcDuration;
    const tailLength = isThirdArc ? 0.25 : (isSecondArc ? 0.50 : 0.45);
    const tailT = Math.max(0, easedT - tailLag);
    const tailStartPos = getQuadraticBezierPoint(Math.max(0, tailT - tailLength), arc.start, arc.control, arc.end);

    // Calculate velocity for spark direction
    const nextT = Math.min(1, easedT + 0.01);
    const nextPos = getQuadraticBezierPoint(nextT, arc.start, arc.control, arc.end);
    const vx = nextPos.x - headPos.x;
    const vy = nextPos.y - headPos.y;

    // Check if head is still on screen
    const isVisible = headPos.x < 105 && headPos.x > -5;

    return { headPos, tailStartPos, t, vx, vy, isVisible };
  };

  // Arc 1: 0 - 1.65s
  const arc1State = getArcState(0, 1.65, ARC1, false, false);
  
  // Arc 2: 1.65 - 3.55s (1.9s duration - slower and bigger)
  const arc2State = getArcState(1.65, 1.9, ARC2, true, false);

  // Arc 3: 3.60 - 4.60s - circular orbit then shoot toward screen
  const getArc3State = () => {
    const arcStartTime = 3.60;
    const orbitDuration = 0.65; // Time for orbit
    const shootDuration = 0.35; // Time for shooting toward screen
    const totalDuration = orbitDuration + shootDuration;
    const arcElapsed = elapsed - arcStartTime;
    if (arcElapsed < 0 || arcElapsed > totalDuration + 0.2) return null;

    const isOrbiting = arcElapsed < orbitDuration;
    
    if (isOrbiting) {
      // Orbiting phase
      const t = arcElapsed / orbitDuration;
      const easedT = easeOutCubic(t);
      const headPos = getCircularOrbitPosition(easedT, ARC3_CENTER, ARC3_RADIUS);

      const tailT = Math.max(0, easedT - 0.15);
      const tailStartPos = getCircularOrbitPosition(Math.max(0, tailT - 0.2), ARC3_CENTER, ARC3_RADIUS);

      const nextT = Math.min(1, easedT + 0.02);
      const nextPos = getCircularOrbitPosition(nextT, ARC3_CENTER, ARC3_RADIUS);
      const vx = nextPos.x - headPos.x;
      const vy = nextPos.y - headPos.y;

      return { headPos, tailStartPos, t, vx, vy, isVisible: true, fadeOpacity: 1, scale: 1, isShootingPhase: false };
    } else {
      // Shooting toward screen phase
      const shootT = (arcElapsed - orbitDuration) / shootDuration;
      const easedShootT = easeInCubic(shootT);
      
      // Start from end of orbit position, scale up rapidly
      const orbitEndPos = getCircularOrbitPosition(1, ARC3_CENTER, ARC3_RADIUS);
      
      // Move toward center and scale up
      const headPos = {
        x: orbitEndPos.x + (50 - orbitEndPos.x) * easedShootT * 0.5,
        y: orbitEndPos.y + (50 - orbitEndPos.y) * easedShootT * 0.5,
      };
      
      const tailStartPos = {
        x: orbitEndPos.x,
        y: orbitEndPos.y,
      };

      // Scale increases dramatically as it "shoots" toward viewer
      const scale = 1 + easedShootT * 8;
      const fadeOpacity = 1 - easedShootT;

      return { headPos, tailStartPos, t: shootT, vx: 0, vy: -1, isVisible: fadeOpacity > 0.05, fadeOpacity, scale, isShootingPhase: true };
    }
  };

  const arc3State = getArc3State();

  // Add afterimages and sparks
  useEffect(() => {
    const now = Date.now();
    if (now - lastSparkTime.current < 30) return;
    lastSparkTime.current = now;

    if (arc1State && arc1State.t < 1) {
      setAfterImages(prev => [...prev.slice(-60), {
        x: arc1State.headPos.x,
        y: arc1State.headPos.y,
        opacity: 0.18,
        createdAt: now,
      }]);
      if (Math.random() < 0.4) {
        setSparks(prev => [...prev, ...generateSparks(arc1State.headPos.x, arc1State.headPos.y, arc1State.vx, arc1State.vy)]);
      }
    }

    if (arc2State && arc2State.t < 1) {
      setAfterImages(prev => [...prev.slice(-60), {
        x: arc2State.headPos.x,
        y: arc2State.headPos.y,
        opacity: 0.22,
        createdAt: now,
      }]);
      if (Math.random() < 0.5) {
        setSparks(prev => [...prev, ...generateSparks(arc2State.headPos.x, arc2State.headPos.y, arc2State.vx, arc2State.vy)]);
      }
    }
  }, [arc1State, arc2State, generateSparks]);

  // READY animation: 0.45 - 1.35 (faster, less hold time)
  const getReadyStyle = () => {
    if (elapsed < 0.45 || elapsed > 1.35) return { opacity: 0, scale: 0.86 };
    if (elapsed < 0.65) {
      const t = (elapsed - 0.45) / 0.20;
      return { opacity: easeOutCubic(t), scale: 0.86 + 0.14 * easeOutCubic(t) };
    }
    if (elapsed < 1.05) {
      return { opacity: 1, scale: 1 };
    }
    const t = (elapsed - 1.05) / 0.30;
    return { opacity: 1 - easeInCubic(t), scale: 1 + 0.06 * easeInCubic(t) };
  };

  // SET animation: 2.10 - 3.10 (faster, less hold time)
  const getSetStyle = () => {
    if (elapsed < 2.10 || elapsed > 3.10) return { opacity: 0, scale: 0.86 };
    if (elapsed < 2.30) {
      const t = (elapsed - 2.10) / 0.20;
      return { opacity: easeOutCubic(t), scale: 0.86 + 0.14 * easeOutCubic(t) };
    }
    if (elapsed < 2.75) {
      return { opacity: 1, scale: 1 };
    }
    const t = (elapsed - 2.75) / 0.35;
    return { opacity: 1 - easeInCubic(t), scale: 1 + 0.07 * easeInCubic(t) };
  };

  // Logo animation: 3.55 - 5.25
  const getLogoStyle = () => {
    if (elapsed < 3.55) return { opacity: 0, scale: 0.94 };
    if (elapsed < 3.80) {
      const t = (elapsed - 3.55) / 0.25;
      return { opacity: easeOutCubic(t), scale: 0.94 + 0.06 * easeOutCubic(t) };
    }
    if (elapsed < 4.50) {
      return { opacity: 1, scale: 1 };
    }
    const t = (elapsed - 4.50) / 0.75;
    return { opacity: 1, scale: 1 + 0.15 * easeOutCubic(t) };
  };

  // Glow pulse: 3.95 - 4.20
  const getGlowPulseOpacity = () => {
    if (elapsed < 3.95 || elapsed > 4.20) return 0;
    const t = (elapsed - 3.95) / 0.25;
    return Math.sin(t * Math.PI) * 0.6;
  };

  // Exit crossfade: 4.75 - 5.25
  const getExitOpacity = () => {
    if (elapsed < 4.75) return 1;
    return 1 - easeInCubic((elapsed - 4.75) / 0.50);
  };

  const readyStyle = getReadyStyle();
  const setStyle = getSetStyle();
  const logoStyle = getLogoStyle();
  const glowPulse = getGlowPulseOpacity();
  const exitOpacity = getExitOpacity();

  const renderComet = (state: ReturnType<typeof getArcState>, isSecondArc: boolean, isThirdArc: boolean = false, id: string = "1", fadeOpacity: number = 1, scale: number = 1) => {
    if (!state || !state.isVisible) return null;
    const { headPos, tailStartPos } = state;
    const baseHeadSize = isThirdArc ? 6 : (isSecondArc ? 14 : 10);
    const baseGlowSize = isThirdArc ? 16 : (isSecondArc ? 36 : 26);
    const headSize = baseHeadSize * scale;
    const glowSize = baseGlowSize * scale;
    const tailWidth = (isThirdArc ? 8 : (isSecondArc ? 24 : 14)) * Math.min(scale, 2);

    return (
      <g>
        {/* Tapered tail gradient */}
        <defs>
          <linearGradient 
            id={`tailGradient${id}`} 
            x1={`${tailStartPos.x}%`} 
            y1={`${tailStartPos.y}%`} 
            x2={`${headPos.x}%`} 
            y2={`${headPos.y}%`}
          >
            <stop offset="0%" stopColor="rgba(255, 106, 0, 0)" />
            <stop offset="60%" stopColor={`rgba(255, 106, 0, ${(isThirdArc ? 0.15 : 0.25) * fadeOpacity})`} />
            <stop offset="100%" stopColor={`rgba(255, 106, 0, ${(isThirdArc ? 0.30 : 0.45) * fadeOpacity})`} />
          </linearGradient>
        </defs>

        {/* Tail */}
        <line
          x1={`${tailStartPos.x}%`}
          y1={`${tailStartPos.y}%`}
          x2={`${headPos.x}%`}
          y2={`${headPos.y}%`}
          stroke={`url(#tailGradient${id})`}
          strokeWidth={tailWidth}
          strokeLinecap="round"
          style={{ filter: `blur(${isThirdArc ? 16 : 28}px)` }}
        />

        {/* Outer glow */}
        <circle
          cx={`${headPos.x}%`}
          cy={`${headPos.y}%`}
          r={glowSize}
          fill={`rgba(255, 106, 0, ${(isThirdArc ? 0.25 : 0.35) * fadeOpacity})`}
          style={{ filter: `blur(${isThirdArc ? 14 : 22}px)` }}
        />

        {/* Bright core */}
        <circle
          cx={`${headPos.x}%`}
          cy={`${headPos.y}%`}
          r={headSize}
          fill="#FFB347"
          opacity={fadeOpacity}
        />
        <circle
          cx={`${headPos.x}%`}
          cy={`${headPos.y}%`}
          r={headSize * 0.6}
          fill="#FFFFFF"
          opacity={0.9 * fadeOpacity}
        />
      </g>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ 
        backgroundColor: "#121212",
        opacity: exitOpacity,
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Afterimage trail */}
        {afterImages.map((a, i) => (
          <circle
            key={i}
            cx={`${a.x}%`}
            cy={`${a.y}%`}
            r={6}
            fill={`rgba(255, 106, 0, ${a.opacity})`}
            style={{ filter: "blur(34px)" }}
          />
        ))}

        {/* Sparks */}
        {sparks.map(s => (
          <circle
            key={s.id}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.size}
            fill={`rgba(255, 179, 71, ${s.opacity})`}
            style={{ filter: "blur(1px)" }}
          />
        ))}

        {/* Arc 1 comet */}
        {renderComet(arc1State, false, false, "1")}

        {/* Arc 2 comet */}
        {renderComet(arc2State, true, false, "2")}

        {/* Arc 3 comet (circular orbit then shoots toward screen) */}
        {arc3State && renderComet(arc3State as any, false, true, "3", arc3State.fadeOpacity, arc3State.scale)}

        {/* Fanfare particles */}
        {fanfareParticles.map(p => (
          <circle
            key={p.id}
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={p.size}
            fill={`rgba(255, 106, 0, ${p.opacity})`}
            style={{ filter: "blur(2px)" }}
          />
        ))}
      </svg>

      {/* READY text */}
      {readyStyle.opacity > 0 && (
        <h1
          className="absolute font-montserrat font-extrabold text-5xl sm:text-6xl tracking-widest"
          style={{
            color: "rgba(255, 255, 255, 0.95)",
            opacity: readyStyle.opacity,
            transform: `scale(${readyStyle.scale})`,
            textShadow: "0 0 40px rgba(255, 106, 0, 0.4)",
          }}
        >
          READY
        </h1>
      )}

      {/* SET text */}
      {setStyle.opacity > 0 && (
        <h1
          className="absolute font-montserrat font-extrabold text-5xl sm:text-6xl tracking-widest"
          style={{
            color: "rgba(255, 255, 255, 0.95)",
            opacity: setStyle.opacity,
            transform: `scale(${setStyle.scale})`,
            textShadow: "0 0 40px rgba(255, 106, 0, 0.4)",
          }}
        >
          SET
        </h1>
      )}

      {/* Logo with glow pulse */}
      {logoStyle.opacity > 0 && (
        <div className="relative flex flex-col items-center">
          {/* Glow pulse */}
          <div
            className="absolute w-56 h-56 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(255, 106, 0, ${0.4 + glowPulse}) 0%, rgba(255, 106, 0, 0.1) 50%, transparent 70%)`,
              transform: `scale(${1 + glowPulse * 0.3})`,
            }}
          />

          {/* R@LLY wordmark */}
          <h1
            className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight relative z-10"
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              opacity: logoStyle.opacity,
              transform: `scale(${logoStyle.scale})`,
              textShadow: "0 0 60px rgba(255, 106, 0, 0.5), 0 0 100px rgba(255, 106, 0, 0.3)",
            }}
          >
            R@LLY
          </h1>

          {/* Tagline */}
          <p
            className="mt-4 text-lg font-medium tracking-wide"
            style={{
              color: "rgba(255, 255, 255, 0.70)",
              opacity: logoStyle.opacity,
              transform: `scale(${logoStyle.scale * 0.95})`,
            }}
          >
            R@lly your troops.
          </p>
        </div>
      )}
    </div>
  );
}
