import { useCallback, useRef } from 'react';
import { useHaptics } from './useHaptics';

/**
 * Hook for After R@lly transition sound effects and haptics.
 * Creates a smooth "dusk to midnight" transition experience.
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
   * Play a subtle "night mode" transition sound - a gentle descending whoosh
   * Duration: ~400ms, much softer than previous version
   */
  const playTransitionSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Create master gain - much quieter
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      // Gentle descending tone (like lights dimming)
      const toneOsc = ctx.createOscillator();
      const toneGain = ctx.createGain();
      toneOsc.type = 'sine';
      toneOsc.frequency.setValueAtTime(400, now);
      toneOsc.frequency.exponentialRampToValueAtTime(150, now + 0.4);
      toneGain.gain.setValueAtTime(0.3, now);
      toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      toneOsc.connect(toneGain);
      toneGain.connect(masterGain);
      toneOsc.start(now);
      toneOsc.stop(now + 0.5);

      // Soft filtered noise for texture (like a gentle whoosh)
      const noiseBufferSize = ctx.sampleRate * 0.5;
      const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBufferSize; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.05;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(2000, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
      noiseFilter.Q.value = 1;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseSource.start(now);
      noiseSource.stop(now + 0.5);

    } catch (error) {
      if (import.meta.env.DEV) console.log('Audio not available for transition sound');
    }
  }, [getAudioContext]);

  /**
   * Trigger the smooth After R@lly transition with sound + single haptic
   * Total duration synced with CSS animation: ~800ms
   */
  const triggerAfterRallyTransition = useCallback(() => {
    // Play the subtle sound
    playTransitionSound();
    
    // Single soft haptic at the midpoint of transition
    setTimeout(() => triggerHaptic('medium'), 400);
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
