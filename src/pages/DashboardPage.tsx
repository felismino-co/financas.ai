import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useBills } from '@/hooks/useBills';
import { useDashboard } from '@/hooks/useDashboard';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, TrendingDown, Target, DollarSign, AlertCircle, BookOpen, Pencil, Building2, RefreshCw } from 'lucide-react';
import { getQuoteOfDay } from '@/lib/quotes';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { categoryIcons } from '@/data/mock-data';
import { useNavigate } from 'react-router-dom';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { HealthScore } from '@/components/HealthScore';
import { ScoreProgressCard } from '@/components/ScoreProgressCard';
import { FamilyMode } from '@/components/FamilyMode';
import { AppTourAutoStart } from '@/components/AppTour';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth, subMonths, format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBankConnections } from '@/hooks/useBankConnections';
import { WeeklyChallenges } from '@/components/WeeklyChallenges';

const card = (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.1 } });

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useAuthState();
  const { userId, familyId, viewMode, setViewMode } = useViewMode();
  const { transactions, loading: loadingTransactions } = useTransactions(userId, familyId, {});
  const { connections, syncConnection } = useBankConnections(userId);
  const { goals } = useGoals(userId, familyId);
  const { bills, upcomingDue } = useBills(userId, familyId);
  const { balance, totalIncome, totalExpense, recentTransactions, score, loading } = useDashboard(
    transactions,
    profile,
    loadingTransactions,
    false
  );
  const navigate = useNavigate();

  const mainGoal = goals[0];
  const mainGoalProgress = mainGoal ? Math.round((mainGoal.currentAmount / mainGoal.targetAmount) * 100) : 0;
  const upcomingBills = useMemo(() => upcomingDue(7, 'expense'), [upcomingDue]);

  const fixedExpensesTotal = useMemo(
    () => transactions.filter((t) => t.type === 'expense' && t.recurring).reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const monthlySobra = (profile?.monthly_income ?? 0) - fixedExpensesTotal;

  const monthlyHistory = useMemo(() => {
    const now = new Date();
    return [5, 4, 3, 2, 1, 0].map(offset => {
      const d = subMonths(now, offset);
      const start = startOfMonth(d).toISOString().split('T')[0];
      const end = endOfMonth(d).toISOString().split('T')[0];
      const monthTx = transactions.filter(t => t.date >= start && t.date <= end);
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        month: format(d, 'MMM', { locale: ptBR }),
        income,
        expense,
      };
    }).reverse();
  }, [transactions]);

  const firstName = profile?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Usuário';
  const insightText = 'Acompanhe suas metas e gastos para melhorar seu score financeiro.';
  const quoteOfDay = getQuoteOfDay();
  const [syncingBank, setSyncingBank] = useState<string | null>(null);
  const latestSync = connections.length > 0
    ? connections.reduce((a, c) => {
        const t = c.last_synced_at ? new Date(c.last_synced_at).getTime() : 0;
        return t > (a ? new Date(a).getTime() : 0) ? c.last_synced_at : a;
      }, null as string | null)
    : null;

  return (
    <div className="space-y-6 pb-4">
      <AppTourAutoStart />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Olá, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">Aqui está seu resumo financeiro</p>
        </div>
        <div className="flex items-center gap-3">
          {(profile?.streak_days ?? 0) > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-medium" title="Sequência de dias">
              {(profile?.streak_days ?? 0) >= 7 ? '🔥' : '📅'} {profile?.streak_days} dias
            </div>
          )}
          <FamilyMode userId={userId} viewMode={viewMode} onViewModeChange={setViewMode} />
          <NotificationsDropdown />
          <div data-tour="profile-avatar" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              (profile?.name || user?.email || 'U').charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="min-w-[140px] flex-1 h-[88px] rounded-xl" />
          ))
        ) : (
          [
            { label: 'Saldo do mês', value: balance, icon: <DollarSign size={18} />, color: balance >= 0 ? 'text-success' : 'text-danger' },
            { label: 'Receitas', value: totalIncome, icon: <TrendingUp size={18} />, color: 'text-success' },
            { label: 'Despesas', value: totalExpense, icon: <TrendingDown size={18} />, color: 'text-danger' },
            { label: mainGoal?.name || 'Meta', value: `${mainGoalProgress}%`, icon: <Target size={18} />, color: 'text-primary', isPercent: true },
          ].map((c, i) => (
            <motion.div
              key={i}
              {...card(i)}
              data-tour={i === 0 ? 'balance-card' : undefined}
              className="min-w-[140px] flex-1 bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                if (i === 0) navigate('/transactions');
                if (i === 1 || i === 2) navigate('/transactions');
                if (i === 3) navigate('/goals');
              }}
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                {c.icon}<span className="text-xs">{(c as { label: string }).label}</span>
              </div>
              <p className={`text-lg font-bold ${c.color}`}>
                {(c as { isPercent?: boolean }).isPercent ? (c as { value: string }).value : `R$ ${typeof c.value === 'number' ? c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : c.value}`}
              </p>
            </motion.div>
          ))
        )}
      </div>

      {!loading && <WeeklyChallenges />}

      {!loading && connections.length > 0 && (
        <motion.div
          {...card(4)}
          className="bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/banks')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={16} className="text-primary" />
                <span className="text-xs text-muted-foreground">Contas bancárias</span>
              </div>
              <p className="font-semibold text-foreground text-sm">
                Último sync: {latestSync ? formatDistanceToNow(new Date(latestSync), { addSuffix: true, locale: ptBR }) : 'Nunca'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async (e) => {
                e.stopPropagation();
                const id = connections[0].id;
                setSyncingBank(id);
                try {
                  await syncConnection(id);
                } finally {
                  setSyncingBank(null);
                }
              }}
              disabled={!!syncingBank}
            >
              <RefreshCw size={14} className={syncingBank ? 'animate-spin' : ''} />
            </Button>
          </div>
          <button type="button" className="mt-2 text-xs text-primary hover:underline">
            Gerenciar bancos <ArrowRight size={12} className="inline ml-1" />
          </button>
        </motion.div>
      )}

      {!loading && connections.length === 0 && (
        <motion.div
          {...card(4)}
          className="bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/banks')}
        >
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground">Contas bancárias</span>
          </div>
          <p className="font-semibold text-foreground text-sm">Conecte seu banco e importe transações automaticamente</p>
          <button type="button" className="mt-2 text-xs text-primary hover:underline">
            Conectar banco <ArrowRight size={12} className="inline ml-1" />
          </button>
        </motion.div>
      )}

      {!loading && upcomingBills.length > 0 && (
        <motion.div
          {...card(4)}
          className="bg-warning/10 border border-warning/30 rounded-xl p-4 shadow-card cursor-pointer hover:border-warning/50 transition-colors"
          onClick={() => navigate('/bills')}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-warning" />
            <span className="text-xs text-muted-foreground">Contas a vencer</span>
          </div>
          <p className="font-semibold text-foreground">{upcomingBills.length} conta(s) nos próximos 7 dias</p>
          <button type="button" className="mt-2 text-xs text-primary hover:underline">
            Ver contas <ArrowRight size={12} className="inline ml-1" />
          </button>
        </motion.div>
      )}

      {!loading && (profile?.monthly_income ?? 0) > 0 && (
        <motion.div
          {...card(5)}
          className="bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/transactions')}
        >
          <p className="text-xs text-muted-foreground mb-1">💡 Sua sobra mensal estimada</p>
          <p className={`text-lg font-bold ${monthlySobra >= 0 ? 'text-success' : 'text-danger'}`}>
            R$ {monthlySobra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Renda − Gastos fixos = Sobra para gastar/poupar</p>
        </motion.div>
      )}

      {!loading && (
        <motion.div
          {...card(6)}
          className="bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/education')}
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground">Frase do dia</span>
          </div>
          <p className="text-sm text-foreground">&quot;{quoteOfDay.text}&quot;</p>
          <button type="button" className="mt-2 text-xs text-primary hover:underline">
            Ver mais <ArrowRight size={12} className="inline ml-1" />
          </button>
        </motion.div>
      )}

      {loading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <motion.div {...card(7)} data-tour="insights-card" className="bg-gradient-ai rounded-xl p-5 shadow-card cursor-pointer hover:opacity-95 transition-opacity" onClick={() => navigate('/insights')}>
          <div className="flex items-start gap-3">
            <span className="text-secondary-foreground mt-1 shrink-0 text-xl">✨</span>
            <div className="flex-1">
              <h3 className="font-semibold text-secondary-foreground text-sm mb-1">Insights da IA</h3>
              <p className="text-secondary-foreground/90 text-sm leading-relaxed">{insightText}</p>
              <button type="button" className="mt-3 flex items-center text-sm font-medium text-secondary-foreground hover:underline">
                Ver todos os insights <ArrowRight size={14} className="ml-1" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <motion.div {...card(8)} className="bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/transactions')}>
          <h3 className="font-semibold text-foreground text-sm mb-4">Receitas vs Despesas</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHistory} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(234 20% 20%)" />
                <XAxis dataKey="month" stroke="hsl(237 17% 67%)" fontSize={12} />
                <YAxis stroke="hsl(237 17% 67%)" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'hsl(234 33% 14%)', border: '1px solid hsl(234 20% 20%)', borderRadius: 8, color: '#F8F8F8', fontSize: 12 }} />
                <Bar dataKey="income" fill="hsl(164 100% 42%)" radius={[4, 4, 0, 0]} name="Receitas" />
                <Bar dataKey="expense" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <motion.div {...card(9)} className="bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/transactions')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">Últimas Transações</h3>
            <button type="button" onClick={() => navigate('/transactions')} className="text-xs text-primary hover:underline">Ver todas</button>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma transação recente.</p>
            ) : (
              recentTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{categoryIcons[t.category] || '📦'}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <motion.div {...card(10)} className="bg-card border border-border rounded-xl p-4 shadow-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/goals')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">Minhas Metas</h3>
            <button type="button" onClick={() => navigate('/goals')} className="text-xs text-primary hover:underline">Ver todas</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
            ) : (
              goals.map(g => {
                const pct = Math.round((g.currentAmount / g.targetAmount) * 100);
                return (
                  <div key={g.id} className="min-w-[180px] border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors" style={{ borderTopColor: g.color, borderTopWidth: 3 }} onClick={() => navigate('/goals')}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{g.emoji} {g.name}</p>
                      <Pencil size={12} className="text-muted-foreground opacity-70" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">R$ {g.currentAmount.toLocaleString('pt-BR')} / R$ {g.targetAmount.toLocaleString('pt-BR')}</p>
                    <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{pct}% concluído</p>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div data-tour="score-card"><HealthScore score={score} /></div>
        <ScoreProgressCard score={profile?.score ?? 0} />
      </div>
    </div>
  );
}
