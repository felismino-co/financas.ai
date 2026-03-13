import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useViewMode } from '@/contexts/ViewModeContext';

const CHALLENGE_POOL = [
  { key: 'transactions_5', desc: 'Registre 5 transações essa semana', target: 5, points: 50 },
  { key: 'budget_food', desc: 'Não ultrapasse o orçamento de alimentação', target: 1, points: 75 },
  { key: 'goal_add', desc: 'Adicione R$50 na meta', target: 50, points: 100 },
  { key: 'pay_debt', desc: 'Pague uma dívida essa semana', target: 1, points: 80 },
  { key: 'access_5', desc: 'Acesse o app 5 dias seguidos', target: 5, points: 60 },
  { key: 'read_laws', desc: 'Leia 2 leis do dinheiro', target: 2, points: 40 },
] as const;

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export function WeeklyChallenges() {
  const { userId } = useViewMode();
  const [challenges, setChallenges] = useState<Array<{
    id: string;
    challenge_key: string;
    progress: number;
    target: number;
    points_reward: number;
    completed_at: string | null;
    week_start: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = getWeekStart();

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStart);
      if (data?.length) {
        setChallenges(data as typeof challenges);
      } else {
        // Sortear 3 desafios para a semana
        const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);
        const toInsert = selected.map((c) => ({
          user_id: userId,
          challenge_key: c.key,
          challenge_data: {},
          progress: 0,
          target: c.target,
          points_reward: c.points,
          week_start: weekStart,
        }));
        try {
          const { data: inserted } = await supabase.from('weekly_challenges').insert(toInsert).select();
          setChallenges((inserted || []) as typeof challenges);
        } catch {
          setChallenges([]);
        }
      }
      setLoading(false);
    })();
  }, [userId, weekStart]);

  const daysLeft = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, diff);
  };

  if (loading || challenges.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
        <Trophy size={18} /> Desafios da semana
      </h3>
      <p className="text-xs text-muted-foreground mb-3">Faltam {daysLeft()} dias</p>
      <div className="space-y-3">
        {challenges.map((c) => {
          const info = CHALLENGE_POOL.find((x) => x.key === c.challenge_key);
          const desc = info?.desc ?? c.challenge_key;
          const pct = c.target > 0 ? Math.min(100, (c.progress / c.target) * 100) : 0;
          const done = !!c.completed_at;
          return (
            <div
              key={c.id}
              className={`p-3 rounded-lg border ${done ? 'bg-success/10 border-success/30' : 'bg-muted/30 border-border'}`}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium">{desc}</p>
                <span className="text-xs text-primary font-medium">+{c.points_reward} pts</span>
              </div>
              {!done && (
                <>
                  <Progress value={pct} className="h-2 mt-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {c.progress}/{c.target}
                  </p>
                </>
              )}
              {done && <p className="text-xs text-success mt-1">✅ Concluído!</p>}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
