import { useCallback, useRef } from 'react';
import { useHaptics } from './useHaptics';

/**
 * Hook for After R@lly transition sound effects and haptics.
 * Creates an immersive "night mode" transition experience.
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
      masterGain.gain.linearRampToValueAtTime(0.3, now + 0.8);
      masterGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

      // Deep bass sweep (club-like)
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(60, now);
      bassOsc.frequency.exponentialRampToValueAtTime(120, now + 0.5);
      bassOsc.frequency.exponentialRampToValueAtTime(80, now + 1.2);
      bassGain.gain.setValueAtTime(0.6, now);
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start(now);
      bassOsc.stop(now + 1.5);

      // Mystical sweep (ethereal high tone)
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'sine';
      sweepOsc.frequency.setValueAtTime(200, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(800, now + 0.6);
      sweepOsc.frequency.exponentialRampToValueAtTime(400, now + 1.2);
      sweepGain.gain.setValueAtTime(0, now);
      sweepGain.gain.linearRampToValueAtTime(0.25, now + 0.3);
      sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
      sweepOsc.connect(sweepGain);
      sweepGain.connect(masterGain);
      sweepOsc.start(now);
      sweepOsc.stop(now + 1.5);

      // Shimmer effect (high harmonics)
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'triangle';
      shimmerOsc.frequency.setValueAtTime(1200, now + 0.2);
      shimmerOsc.frequency.exponentialRampToValueAtTime(2400, now + 0.5);
      shimmerOsc.frequency.exponentialRampToValueAtTime(1600, now + 1.0);
      shimmerGain.gain.setValueAtTime(0, now);
      shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.4);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 1.3);
      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(masterGain);
      shimmerOsc.start(now + 0.2);
      shimmerOsc.stop(now + 1.5);

      // "Woosh" noise sweep for texture
      const noiseBufferSize = ctx.sampleRate * 1.5;
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
      noiseFilter.frequency.exponentialRampToValueAtTime(3000, now + 0.6);
      noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 1.2);
      noiseFilter.Q.value = 2;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
      
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseSource.start(now);
      noiseSource.stop(now + 1.5);

    } catch (error) {
      console.log('Audio not available for transition sound');
    }
  }, [getAudioContext]);

  /**
   * Trigger the full After R@lly transition with sound + haptics
   */
  const triggerAfterRallyTransition = useCallback(() => {
    // Play the sound
    playTransitionSound();
    
    // Haptic pattern: dramatic pulse sequence
    // Initial heavy pulse
    setTimeout(() => triggerHaptic('heavy'), 100);
    // Quick double-pulse
    setTimeout(() => triggerHaptic('medium'), 400);
    setTimeout(() => triggerHaptic('medium'), 550);
    // Final success pulse
    setTimeout(() => triggerHaptic('success'), 900);
  }, [playTransitionSound, triggerHaptic]);

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
  };
}
