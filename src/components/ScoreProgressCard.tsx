import { motion } from 'framer-motion';
import { getScoreLevel, getPointsToNextLevel } from '@/lib/score';

export function ScoreProgressCard({ score = 0 }: { score?: number }) {
  const level = getScoreLevel(score);
  const toNext = getPointsToNextLevel(score);
  const pct = Math.min(100, (score / 1000) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 shadow-card"
    >
      <h3 className="font-semibold text-foreground text-sm mb-2">Seu progresso</h3>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{level.emoji}</span>
        <div>
          <p className="font-bold text-foreground">{level.label}</p>
          <p className="text-xs text-muted-foreground">{score} / 1000 pontos</p>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      {toNext !== null && (
        <p className="text-xs text-muted-foreground mt-2">Faltam {toNext} pts para o próximo nível</p>
      )}
    </motion.div>
  );
}
