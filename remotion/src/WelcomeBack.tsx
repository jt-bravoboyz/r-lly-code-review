import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Montserrat';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '800'],
  subsets: ['latin'],
});

// 1:1 port of src/components/WelcomeBackOverlay.tsx math, driven by frame->seconds.
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const ph = (elapsed: number, start: number, end: number) =>
  clamp((elapsed - start) / (end - start));

export const WelcomeBack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = frame / fps;

  const ambientOpacity = easeOutCubic(ph(elapsed, 0, 0.5)) * 0.14;

  const sweepProgress = ph(elapsed, 0.05, 0.55);
  const sweepX = easeOutQuart(sweepProgress) * 120 - 10;
  const sweepOpacity = Math.sin(sweepProgress * Math.PI) * 0.2;

  const eyebrowOpacity = easeOutCubic(ph(elapsed, 0.15, 0.4));
  const rllyOpacity = easeOutCubic(ph(elapsed, 0.35, 0.6));

  const atProgress = easeOutCubic(ph(elapsed, 0.4, 0.75));
  // Scale px values up for 1080x1920 mobile canvas (≈3x original component scale)
  const SCALE = 3;
  const atX = 80 * SCALE * (1 - atProgress);
  const atY = -50 * SCALE * (1 - atProgress);
  const atOpacity = easeOutCubic(ph(elapsed, 0.4, 0.55));
  const atScale = 0.7 + 0.3 * atProgress;
  const atGlow = ph(elapsed, 0.7, 0.95);
  const atGlowIntensity =
    elapsed >= 0.4
      ? atGlow > 0
        ? 0.6 + Math.sin(atGlow * Math.PI) * 0.3
        : easeOutCubic(ph(elapsed, 0.4, 0.75)) * 0.6
      : 0;

  const exitProgress = ph(elapsed, 0.95, 1.15);
  const exitOpacity = 1 - easeInCubic(exitProgress);
  const exitDrift = -8 * SCALE * easeInCubic(exitProgress);
  const finalAmbient =
    exitProgress > 0 ? ambientOpacity * (1 - exitProgress) : ambientOpacity;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0A0A0A',
        fontFamily,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ambient orange radial */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(244, 122, 25, ${finalAmbient}) 0%, transparent 70%)`,
        }}
      />

      {/* Light sweep */}
      {sweepOpacity > 0.01 && (
        <div
          style={{
            position: 'absolute',
            top: '48%',
            left: `${sweepX}%`,
            width: '300px',
            height: '6px',
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,${sweepOpacity}), transparent)`,
            filter: 'blur(120px)',
            transform: 'scaleX(4)',
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
          opacity: exitOpacity,
          transform: exitProgress > 0 ? `translateY(${exitDrift}px)` : undefined,
        }}
      >
        <span
          style={{
            fontFamily,
            fontWeight: 400,
            fontSize: 36,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.22em',
            opacity: eyebrowOpacity,
            minHeight: '1em',
          }}
        >
          Welcome back
        </span>

        <h1
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: 240,
            letterSpacing: '-0.02em',
            margin: 0,
            minHeight: '1.2em',
            lineHeight: 1.1,
          }}
        >
          <span style={{ color: 'rgba(255, 255, 255, 0.95)', opacity: rllyOpacity }}>
            R
          </span>
          <span
            style={{
              display: 'inline-block',
              color: '#F47A19',
              opacity: atOpacity,
              transform:
                atProgress < 1
                  ? `translate(${atX}px, ${atY}px) scale(${atScale})`
                  : 'none',
              textShadow:
                atGlowIntensity > 0
                  ? `0 0 ${12 + atGlowIntensity * 30}px rgba(244, 122, 25, ${atGlowIntensity * 0.65}), 0 0 ${25 + atGlowIntensity * 45}px rgba(244, 122, 25, ${atGlowIntensity * 0.3})`
                  : 'none',
            }}
          >
            @
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.95)', opacity: rllyOpacity }}>
            lly.
          </span>
        </h1>
      </div>
    </AbsoluteFill>
  );
};
