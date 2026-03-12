import { motion } from 'framer-motion';

export function HealthScore({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 70) return 'hsl(164 100% 42%)';
    if (s >= 40) return 'hsl(45 100% 51%)';
    return 'hsl(0 84% 60%)';
  };
  const getLabel = (s: number) => {
    if (s >= 80) return 'Excelente';
    if (s >= 60) return 'Boa';
    if (s >= 40) return 'Regular';
    return 'Precisa de atenção';
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (score / 100) * circumference * 0.75;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6 shadow-card text-center">
      <h3 className="font-semibold text-foreground text-sm mb-4">Saúde Financeira</h3>
      <div className="relative mx-auto w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: 'rotate(135deg)' }}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(234 20% 22%)" strokeWidth="10"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium" style={{ color }}>{getLabel(score)}</p>
    </motion.div>
  );
}
