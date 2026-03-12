import { useMemo, useState } from 'react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { categoryColors } from '@/data/mock-data';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const periodLabels = ['Mês atual', 'Mês anterior', 'Últimos 3 meses', 'Últimos 6 meses', 'Ano atual'] as const;

export default function ReportsPage() {
  const { userId, familyId } = useViewMode();
  const { transactions, loading } = useTransactions(userId, familyId, {});
  const [period, setPeriod] = useState<typeof periodLabels[number]>('Últimos 6 meses');

  const { filtered, balanceHistory, monthlyHistory } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    switch (period) {
      case 'Mês atual':
        start = startOfMonth(now);
        break;
      case 'Mês anterior':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'Últimos 3 meses':
        start = startOfMonth(subMonths(now, 2));
        break;
      case 'Últimos 6 meses':
        start = startOfMonth(subMonths(now, 5));
        break;
      case 'Ano atual':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = startOfMonth(subMonths(now, 5));
    }
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const filtered = transactions.filter(t => t.date >= startStr && t.date <= endStr);

    const monthsCount = period === 'Mês atual' || period === 'Mês anterior' ? 1 : period === 'Últimos 3 meses' ? 3 : period === 'Últimos 6 meses' ? 6 : 12;
    const monthlyHistory = [];
    const balanceHistory = [];
    let runningBalance = 0;
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d).toISOString().split('T')[0];
      const mEnd = endOfMonth(d).toISOString().split('T')[0];
      const monthTx = transactions.filter(t => t.date >= mStart && t.date <= mEnd);
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      runningBalance += income - expense;
      monthlyHistory.push({ month: format(d, 'MMM', { locale: ptBR }), income, expense });
      balanceHistory.push({ month: format(d, 'MMM', { locale: ptBR }), balance: runningBalance });
    }

    return { filtered, balanceHistory, monthlyHistory };
  }, [transactions, period]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  const expensesByCategory = filtered
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const topExpenses = [...filtered]
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-bold text-foreground">Relatórios</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {periodLabels.map(p => (
          <button key={p} type="button" onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Receitas', value: totalIncome, color: 'text-success' },
          { label: 'Despesas', value: totalExpense, color: 'text-danger' },
          { label: 'Saldo', value: balance, color: balance >= 0 ? 'text-success' : 'text-danger' },
          { label: 'Taxa de poupança', value: `${savingsRate}%`, color: 'text-primary', isText: true },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-3 shadow-card">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>
              {(c as { isText?: boolean }).isText ? (c as { value: string }).value : `R$ ${(c.value as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
          </motion.div>
        ))}
      </div>

      {balanceHistory.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-4 shadow-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">Evolução do Saldo</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(234 20% 20%)" />
                <XAxis dataKey="month" stroke="hsl(237 17% 67%)" fontSize={12} />
                <YAxis stroke="hsl(237 17% 67%)" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
                <Tooltip contentStyle={{ background: 'hsl(234 33% 14%)', border: '1px solid hsl(234 20% 20%)', borderRadius: 8, color: '#F8F8F8', fontSize: 12 }} />
                <Line type="monotone" dataKey="balance" stroke="hsl(164 100% 42%)" strokeWidth={2} dot={{ fill: 'hsl(164 100% 42%)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {monthlyHistory.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-4 shadow-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">Receitas vs Despesas por Mês</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(234 20% 20%)" />
                <XAxis dataKey="month" stroke="hsl(237 17% 67%)" fontSize={12} />
                <YAxis stroke="hsl(237 17% 67%)" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'hsl(234 33% 14%)', border: '1px solid hsl(234 20% 20%)', borderRadius: 8, color: '#F8F8F8', fontSize: 12 }} />
                <Bar dataKey="income" fill="hsl(164 100% 42%)" name="Receitas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(0 84% 60%)" name="Despesas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {pieData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-4 shadow-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">Despesas por Categoria</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry) => <Cell key={entry.name} fill={categoryColors[entry.name] || '#666'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(234 33% 14%)', border: '1px solid hsl(234 20% 20%)', borderRadius: 8, color: '#F8F8F8', fontSize: 12 }}
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {pieData.map(d => (
              <span key={d.name} className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[d.name] || '#666' }} />{d.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-card border border-border rounded-xl p-4 shadow-card">
        <h3 className="font-semibold text-foreground text-sm mb-4">Top 5 Maiores Despesas</h3>
        <div className="space-y-2">
          {topExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
          ) : (
            topExpenses.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <div>
                    <p className="text-sm text-foreground">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{t.category}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-danger">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>

      <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted">
        <FileDown size={16} className="mr-2" /> Exportar relatório PDF
      </Button>
    </div>
  );
}
