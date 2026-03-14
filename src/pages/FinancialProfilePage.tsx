import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Award, Wallet, BarChart3, Sparkles, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthState } from '@/contexts/AuthStateContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useAchievements } from '@/hooks/useAchievements';
import { getScoreLevel } from '@/lib/score';
import { supabase } from '@/lib/supabase';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { Progress } from '@/components/ui/progress';

export default function FinancialProfilePage() {
  const { profile } = useAuthState();
  const { userId, familyId } = useViewMode();
  const { unlocked } = useAchievements(userId);
  const [incomeSources, setIncomeSources] = useState<Array<{ name: string; amount: number; frequency: string }>>([]);
  const [goals, setGoals] = useState<Array<{ name: string; target_amount: number; current_amount: number }>>([]);
  const [balance, setBalance] = useState(0);
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [totalBills, setTotalBills] = useState(0);
  const [recommendations, setRecommendations] = useState<Array<{ title: string; description: string }>>([]);
  const [loading, setLoading] = useState(true);

  const score = Number(profile?.score ?? profile?.financial_score ?? 0);
  const level = getScoreLevel(score);
  const streak = profile?.streak_days ?? 0;
  const skills = (profile?.skills as { selected?: string[] })?.selected ?? [];

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let txQ = supabase.from('transactions').select('type, amount, date');
        let goalsQ = supabase.from('goals').select('name, target_amount, current_amount');
        let recvQ = supabase.from('receivables').select('amount').eq('status', 'pending');
        let billsQ = supabase.from('bills').select('amount').eq('type', 'expense').is('paid_at', null);
        let insightsQ = supabase.from('insights').select('title, description').eq('type', 'daily_recommendation').order('created_at', { ascending: false }).limit(3);

        if (familyId) {
          txQ = txQ.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
          goalsQ = goalsQ.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
          recvQ = recvQ.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
          billsQ = billsQ.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
          insightsQ = insightsQ.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
        } else {
          txQ = txQ.eq('user_id', userId);
          goalsQ = goalsQ.eq('user_id', userId);
          recvQ = recvQ.eq('user_id', userId);
          billsQ = billsQ.eq('user_id', userId);
          insightsQ = insightsQ.eq('user_id', userId);
        }

        const [txRes, goalsRes, recvRes, billsRes, insightsRes] = await Promise.all([
          txQ,
          goalsQ,
          recvQ,
          billsQ,
          insightsQ,
        ]);
        if (cancelled) return;
        const tx = (txRes.data || []) as Array<{ type: string; amount: number; date?: string }>;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const monthTx = tx.filter((t) => t.date && t.date >= monthStart && t.date <= monthEnd);
        const income = monthTx.filter((t: { type: string }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
        const expense = monthTx.filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
        setBalance(income - expense);
        setGoals(goalsRes.data || []);
        setTotalReceivables((recvRes.data || []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0));
        setTotalBills((billsRes.data || []).reduce((s: number, b: { amount: number }) => s + Number(b.amount), 0));
        setRecommendations((insightsRes.data || []).map((i: { title: string; description: string }) => ({ title: i.title, description: i.description })));
        const sources = (profile?.income_sources as Array<{ name: string; amount: number; frequency: string }>) ?? [];
        setIncomeSources(sources);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, familyId, profile?.income_sources]);

  const goalsTotal = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const netWorth = balance + totalReceivables - totalBills + goalsTotal;
  const topBadges = unlocked.slice(0, 3).map((key) => ACHIEVEMENTS.find((a) => a.key === key)).filter(Boolean);
  const pctToNext = level.max < 1000 ? Math.min(100, ((score - level.min) / (level.max - level.min + 1)) * 100) : 100;

  const behaviorProfile = (() => {
    const income = profile?.monthly_income ?? 0;
    if (income <= 0) return { label: 'A definir', emoji: '❓' };
    const savingsRate = goalsTotal / income;
    if (savingsRate >= 0.2) return { label: 'Investidor', emoji: '📈' };
    if (savingsRate >= 0.1) return { label: 'Poupador', emoji: '💰' };
    if (balance >= 0) return { label: 'Equilibrado', emoji: '⚖️' };
    return { label: 'Gastador', emoji: '🛒' };
  })();

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 size={24} /> Meu Perfil Financeiro
        </h1>
        <p className="text-sm text-muted-foreground">Visão completa da sua saúde financeira</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Resumo do perfil */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-4 space-y-4"
          >
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} /> Resumo do perfil
            </h2>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-2xl font-bold text-primary">{score} pts</p>
                <Progress value={pctToNext} className="h-2 w-24 mt-1" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nível</p>
                <p className="text-lg font-semibold">{level.emoji} {level.label}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="text-lg font-semibold">{streak > 7 ? '🔥' : '📅'} {streak} dias</p>
              </div>
            </div>
            {topBadges.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Insígnias</p>
                <div className="flex gap-2">
                  {topBadges.map((a) => a && (
                    <span key={a.key} className="text-2xl" title={a.name}>{a.emoji}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Fontes de renda */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <Wallet size={18} /> Fontes de renda
            </h2>
            {incomeSources.length > 0 ? (
              <div className="space-y-2">
                {incomeSources.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="text-success">R$ {Number(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{s.frequency}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">
                  Total estimado: R$ {incomeSources.reduce((sum, s) => sum + Number(s.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma fonte cadastrada.</p>
            )}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.href = '/profile'}>
              <Edit size={14} className="mr-2" /> Editar no perfil
            </Button>
          </motion.div>

          {/* Habilidades */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <Award size={18} /> Habilidades e competências
            </h2>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-primary/20 text-primary text-sm">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma habilidade cadastrada.</p>
            )}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.href = '/profile'}>
              <Edit size={14} className="mr-2" /> Editar habilidades
            </Button>
          </motion.div>

          {/* Comportamento financeiro */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-2">
              <BarChart3 size={18} /> Comportamento financeiro
            </h2>
            <p className="text-lg font-medium">{behaviorProfile.emoji} {behaviorProfile.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Perfil detectado com base nos seus dados de gastos, metas e saldo.
            </p>
          </motion.div>

          {/* Patrimônio estimado */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <Target size={18} /> Patrimônio estimado
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo do mês</span>
                <span className={balance >= 0 ? 'text-success' : 'text-destructive'}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Em metas (poupança)</span>
                <span className="text-foreground">R$ {goalsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">A receber</span>
                <span className="text-success">R$ {totalReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dívidas</span>
                <span className="text-destructive">- R$ {totalBills.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span>Patrimônio líquido</span>
                <span className={netWorth >= 0 ? 'text-success' : 'text-destructive'}>R$ {netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </motion.div>

          {/* Recomendações da IA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <Sparkles size={18} /> Recomendações personalizadas
            </h2>
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                As recomendações são geradas diariamente com base no seu perfil. Verifique a página de Insights para ver as dicas da IA.
              </p>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
