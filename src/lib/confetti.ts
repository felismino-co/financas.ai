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

export function celebrateProgress(pct: number) {
  if (pct >= 100) {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ['#00D4AA', '#7C3AED', '#F39C12'] });
  } else if (pct >= 75) {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#00D4AA', '#7C3AED'] });
  } else if (pct >= 50) {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.65 }, colors: ['#00D4AA'] });
  } else if (pct >= 25) {
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: ['#00D4AA'] });
  } else if (pct >= 10) {
    confetti({ particleCount: 15, spread: 50, origin: { y: 0.75 }, colors: ['#00D4AA'] });
  }
}
