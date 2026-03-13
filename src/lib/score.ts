export const SCORE_LEVELS = [
  { min: 0, max: 100, label: 'Iniciante', emoji: '🌱' },
  { min: 101, max: 250, label: 'Aprendiz', emoji: '💡' },
  { min: 251, max: 500, label: 'Organizado', emoji: '⚡' },
  { min: 501, max: 750, label: 'Estrategista', emoji: '🎯' },
  { min: 751, max: 950, label: 'Expert', emoji: '💎' },
  { min: 951, max: 1000, label: 'Mestre Financeiro', emoji: '👑' },
] as const;

export type ScoreAction =
  | 'transaction'
  | 'goal_created'
  | 'goal_achieved'
  | 'debt_paid'
  | 'streak_7'
  | 'bank_connected'
  | 'onboarding_complete'
  | 'income_added';

export const SCORE_POINTS: Record<ScoreAction, number> = {
  transaction: 2,
  goal_created: 20,
  goal_achieved: 100,
  debt_paid: 50,
  streak_7: 30,
  bank_connected: 50,
  onboarding_complete: 30,
  income_added: 25,
};

export function getScoreLevel(score: number): (typeof SCORE_LEVELS)[number] {
  const s = Math.max(0, Math.min(1000, score));
  for (let i = SCORE_LEVELS.length - 1; i >= 0; i--) {
    if (s >= SCORE_LEVELS[i].min) return SCORE_LEVELS[i];
  }
  return SCORE_LEVELS[0];
}

export function getPointsToNextLevel(score: number): number | null {
  const level = getScoreLevel(score);
  const idx = SCORE_LEVELS.indexOf(level);
  if (idx >= SCORE_LEVELS.length - 1) return null;
  const next = SCORE_LEVELS[idx + 1];
  return next.min - score;
}
