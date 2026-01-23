import { useCallback, useRef } from 'react';
import { useHaptics } from './useHaptics';

/**
 * Hook for After R@lly transition sound effects and haptics.
 * Creates an immersive "night mode" transition experience with rainbow glide.
 */
export function useAfterRallyTransition() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { triggerHaptic } = useHaptics();

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  /**
   * Play the "night mode" transition sound - a mystical, club-like sound
   * that sweeps from low to high with reverb-like decay
   */
  const playTransitionSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Create master gain
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.4, now + 0.1);
      masterGain.gain.linearRampToValueAtTime(0.3, now + 1.2);
      masterGain.gain.exponentialRampToValueAtTime(0.01, now + 2.2);

      // Deep bass sweep (club-like) - extended for rainbow transition
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(60, now);
      bassOsc.frequency.exponentialRampToValueAtTime(120, now + 0.8);
      bassOsc.frequency.exponentialRampToValueAtTime(80, now + 1.8);
      bassGain.gain.setValueAtTime(0.6, now);
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 2.2);
      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start(now);
      bassOsc.stop(now + 2.2);

      // Mystical sweep (ethereal high tone) - extended
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'sine';
      sweepOsc.frequency.setValueAtTime(200, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(800, now + 1.0);
      sweepOsc.frequency.exponentialRampToValueAtTime(400, now + 1.8);
      sweepGain.gain.setValueAtTime(0, now);
      sweepGain.gain.linearRampToValueAtTime(0.25, now + 0.5);
      sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
      sweepOsc.connect(sweepGain);
      sweepGain.connect(masterGain);
      sweepOsc.start(now);
      sweepOsc.stop(now + 2.2);

      // Shimmer effect (high harmonics) - synced with rainbow
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'triangle';
      shimmerOsc.frequency.setValueAtTime(1200, now + 0.3);
      shimmerOsc.frequency.exponentialRampToValueAtTime(2400, now + 0.8);
      shimmerOsc.frequency.exponentialRampToValueAtTime(1600, now + 1.5);
      shimmerGain.gain.setValueAtTime(0, now);
      shimmerGain.gain.linearRampToValueAtTime(0.1, now + 0.6);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);
      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(masterGain);
      shimmerOsc.start(now + 0.3);
      shimmerOsc.stop(now + 2.2);

      // "Woosh" noise sweep for texture - extended for rainbow
      const noiseBufferSize = ctx.sampleRate * 2.2;
      const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBufferSize; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.1;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(200, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(3000, now + 1.0);
      noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 1.8);
      noiseFilter.Q.value = 2;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.5);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
      
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseSource.start(now);
      noiseSource.stop(now + 2.2);

    } catch (error) {
      console.log('Audio not available for transition sound');
    }
  }, [getAudioContext]);

  /**
   * Create celebratory sparkles that burst across the screen during rainbow transition
   */
  const createSparkles = useCallback(() => {
    const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#9B59B6'];
    const container = document.body;
    
    for (let i = 0; i < 25; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'rainbow-sparkle';
      sparkle.style.cssText = `
        position: fixed;
        left: ${Math.random() * 100}vw;
        top: ${Math.random() * 100}vh;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        box-shadow: 0 0 12px ${colors[Math.floor(Math.random() * colors.length)]};
        animation: sparkle-burst 1.8s ease-out forwards;
        animation-delay: ${Math.random() * 1.0}s;
        pointer-events: none;
        z-index: 10000;
      `;
      container.appendChild(sparkle);
      
      // Remove after animation
      setTimeout(() => sparkle.remove(), 3000);
    }
  }, []);

  /**
   * Trigger the full After R@lly transition with rainbow glide, sound + haptics
   */
  const triggerAfterRallyTransition = useCallback(() => {
    // Play the sound
    playTransitionSound();
    
    // Create sparkle burst
    createSparkles();
    
    // Haptic pattern: dramatic pulse sequence synced with rainbow (2.2s total)
    // Initial heavy pulse as rainbow starts
    setTimeout(() => triggerHaptic('heavy'), 100);
    // Medium pulses as rainbow sweeps across
    setTimeout(() => triggerHaptic('medium'), 600);
    setTimeout(() => triggerHaptic('medium'), 1000);
    // Another medium as it reaches purple tones
    setTimeout(() => triggerHaptic('medium'), 1400);
    // Final success pulse as transition completes
    setTimeout(() => triggerHaptic('success'), 1900);
  }, [playTransitionSound, createSparkles, triggerHaptic]);

  /**
   * Quick confirmation sound for accepting After R@lly
   */
  const playAcceptSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Pleasant ascending chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now); // C5
      osc.frequency.setValueAtTime(659, now + 0.1); // E5
      osc.frequency.setValueAtTime(784, now + 0.2); // G5
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      
      triggerHaptic('success');
    } catch (error) {
      triggerHaptic('success');
    }
  }, [getAudioContext, triggerHaptic]);

  return {
    triggerAfterRallyTransition,
    playTransitionSound,
    playAcceptSound,
    createSparkles,
  };
}
