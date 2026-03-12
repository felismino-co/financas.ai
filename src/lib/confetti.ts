import confetti from 'canvas-confetti';

export function celebrateGoal() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#00D4AA', '#7C3AED', '#F39C12', '#E91E63'],
  });
}

export function celebrateScore() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#00D4AA', '#3498DB'],
  });
}
