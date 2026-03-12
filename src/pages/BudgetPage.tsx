import { useMemo, useState } from 'react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useAuthState } from '@/contexts/AuthStateContext';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { categoryColors, categoryIcons, expenseCategories } from '@/data/mock-data';
import { toast } from 'sonner';

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

export default function BudgetPage() {
  const { userId, familyId } = useViewMode();
  const { profile } = useAuthState();
  const { transactions } = useTransactions(userId, familyId, { month: currentMonth, year: currentYear });
  const spentByCategory = useMemo(() => {
    const out: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => { out[t.category] = (out[t.category] ?? 0) + t.amount; });
    return out;
  }, [transactions]);
  const spentByCategoryFixed = useMemo(() => {
    const out: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense' && t.recurring).forEach(t => { out[t.category] = (out[t.category] ?? 0) + t.amount; });
    return out;
  }, [transactions]);
  const spentByCategoryVariable = useMemo(() => {
    const out: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense' && !t.recurring).forEach(t => { out[t.category] = (out[t.category] ?? 0) + t.amount; });
    return out;
  }, [transactions]);
  const { budgets, loading, setLimit } = useBudgets(userId, familyId, currentMonth, currentYear, spentByCategory);
  const [editId, setEditId] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);

  const displayList = useMemo(() => {
    return expenseCategories.map(cat => ({
      id: budgets.find(b => b.category === cat)?.id ?? cat,
      name: cat,
      icon: categoryIcons[cat] || '📦',
      limit: budgets.find(b => b.category === cat)?.limit ?? 0,
      spent: spentByCategory[cat] ?? 0,
      fixed: spentByCategoryFixed[cat] ?? 0,
      variable: spentByCategoryVariable[cat] ?? 0,
    }));
  }, [budgets, spentByCategory, spentByCategoryFixed, spentByCategoryVariable]);

  const totalLimit = displayList.reduce((s, b) => s + b.limit, 0);
  const totalSpent = displayList.reduce((s, b) => s + b.spent, 0);
  const totalFixed = displayList.reduce((s, b) => s + b.fixed, 0);
  const totalVariable = displayList.reduce((s, b) => s + b.variable, 0);
  const totalAvailable = totalLimit - totalSpent;
  const sobraAposFixos = (profile?.monthly_income ?? 0) - totalFixed;

  const pieData = displayList.filter(b => b.spent > 0).map(b => ({ name: b.name, value: b.spent }));
  const colors = displayList.filter(b => b.spent > 0).map(b => categoryColors[b.name] || '#666');

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-danger';
    if (pct >= 70) return 'bg-warning';
    return 'bg-success';
  };

  const openEdit = (category: string, currentLimit: number) => {
    setEditCategory(category);
    setLimitValue(String(currentLimit));
    setEditId(category);
  };

  const handleSaveLimit = async () => {
    if (editCategory == null || !userId) return;
    try {
      await setLimit(editCategory, Number(limitValue));
      setEditId(null);
      setEditCategory(null);
      toast.success('Limite atualizado.');
    } catch {
      toast.error('Erro ao salvar.');
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-bold text-foreground">Orçamento</h1>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-4 shadow-card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Definido</p>
            <p className="text-lg font-bold text-foreground">R$ {totalLimit.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Utilizado</p>
            <p className="text-lg font-bold text-danger">R$ {totalSpent.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gastos fixos</p>
            <p className="text-sm font-bold text-foreground">R$ {totalFixed.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gastos variáveis</p>
            <p className="text-sm font-bold text-foreground">R$ {totalVariable.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        {(profile?.monthly_income ?? 0) > 0 && (
          <p className="text-sm text-muted-foreground border-t border-border pt-3 text-center">
            Sobra disponível após fixos: <span className={sobraAposFixos >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>R$ {sobraAposFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </p>
        )}
      </motion.div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          {pieData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-4 shadow-card">
              <h3 className="font-semibold text-foreground text-sm mb-4">Despesas por Categoria</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pieData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(234 33% 14%)', border: '1px solid hsl(234 20% 20%)', borderRadius: 8, color: '#F8F8F8', fontSize: 12 }}
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {displayList.filter(b => b.spent > 0).map((b, i) => (
                  <div key={b.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[b.name] || '#666' }} />
                    {b.name}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {displayList.map((b, i) => {
              const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
              return (
                <motion.div key={b.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4 shadow-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{b.icon}</span>
                      <span className="text-sm font-medium text-foreground">{b.name}</span>
                    </div>
                    <button type="button" onClick={() => openEdit(b.name, b.limit)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Pencil size={12} /> Definir limite
                    </button>
                  </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>
                  R$ {b.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {b.limit.toLocaleString('pt-BR')}
                  {(b.fixed > 0 || b.variable > 0) && (
                    <span className="block text-[10px] opacity-80">Fixos: R$ {b.fixed.toLocaleString('pt-BR')} · Variáveis: R$ {b.variable.toLocaleString('pt-BR')}</span>
                  )}
                </span>
                    <span className={pct >= 90 ? 'text-danger' : pct >= 70 ? 'text-warning' : 'text-success'}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${getBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={!!editId} onOpenChange={() => { setEditId(null); setEditCategory(null); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Definir Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={limitValue} onChange={e => setLimitValue(e.target.value)} placeholder="Valor limite (R$)" type="number" className="bg-muted border-border" />
            <Button onClick={handleSaveLimit} disabled={!limitValue} className="w-full bg-primary text-primary-foreground font-semibold">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
