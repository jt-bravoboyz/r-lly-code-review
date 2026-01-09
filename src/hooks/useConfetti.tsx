import confetti from 'canvas-confetti';

export function useConfetti() {
  const fireConfetti = () => {
    // Fire confetti from the center
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0.8,
      decay: 0.94,
      startVelocity: 30,
      colors: ['#F26C15', '#FFD93D', '#FF6B35', '#FF8C42', '#FFA500', '#FFCC00'],
    };

    confetti({
      ...defaults,
      particleCount: 50,
      scalar: 1.2,
      shapes: ['circle', 'square'],
      origin: { x: 0.5, y: 0.5 },
    });

    // Fire from left
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 30,
        origin: { x: 0.2, y: 0.6 },
      });
    }, 150);

    // Fire from right
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 30,
        origin: { x: 0.8, y: 0.6 },
      });
    }, 300);
  };

  const fireRallyConfetti = () => {
    // More dramatic rally celebration
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#F26C15', '#FFD93D', '#FF6B35', '#FF8C42', '#FFA500'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  return { fireConfetti, fireRallyConfetti };
}
