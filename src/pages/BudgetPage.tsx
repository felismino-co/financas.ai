import { useMemo, useState } from 'react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useBills } from '@/hooks/useBills';
import { useBudgets } from '@/hooks/useBudgets';
import { useAuthState } from '@/contexts/AuthStateContext';
import { motion } from 'framer-motion';
import { Pencil, Plus, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { categoryColors, categoryIcons, expenseCategories } from '@/data/mock-data';
import { mapBillCategoryToExpense } from '@/data/category-mapping';
import { CurrencyInput, parseCurrencyInput } from '@/components/CurrencyInput';
import { toast } from 'sonner';

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

function getBillsInMonth(bills: { due_day: number; amount: number; paid_at?: string | null; description: string; category: string | null }[]) {
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();
  return bills.filter((b) => b.due_day >= 1 && b.due_day <= lastDay);
}

export default function BudgetPage() {
  const { userId, familyId } = useViewMode();
  const { profile } = useAuthState();
  const { transactions, addTransaction, refetch: refetchTx } = useTransactions(userId, familyId, { month: currentMonth, year: currentYear });
  const { bills } = useBills(userId, familyId);
  const monthBills = useMemo(() => {
    const expenseBills = bills.filter((b) => b.type === 'expense');
    return getBillsInMonth(expenseBills);
  }, [bills]);

  const billsByCategory = useMemo(() => {
    const out: Record<string, { paid: number; pending: number; items: { desc: string; amount: number; paid: boolean }[] }> = {};
    for (const b of monthBills) {
      const cat = mapBillCategoryToExpense(b.category);
      if (!out[cat]) out[cat] = { paid: 0, pending: 0, items: [] };
      const paid = !!b.paid_at;
      out[cat].items.push({ desc: b.description, amount: b.amount, paid });
      if (paid) out[cat].paid += b.amount;
      else out[cat].pending += b.amount;
    }
    return out;
  }, [monthBills]);

  const spentByCategory = useMemo(() => {
    const out: Record<string, number> = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      out[t.category] = (out[t.category] ?? 0) + t.amount;
    });
    return out;
  }, [transactions]);

  const totalByCategory = useMemo(() => {
    const out: Record<string, number> = {};
    expenseCategories.forEach((cat) => {
      const tx = spentByCategory[cat] ?? 0;
      const billsFromCat = billsByCategory[cat];
      const billsPaid = billsFromCat?.paid ?? 0;
      const billsPending = billsFromCat?.pending ?? 0;
      out[cat] = tx + billsPaid + billsPending;
    });
    return out;
  }, [spentByCategory, billsByCategory]);

  const spentByCategoryForBudget = useMemo(() => {
    const out: Record<string, number> = {};
    expenseCategories.forEach((cat) => {
      const tx = spentByCategory[cat] ?? 0;
      const billsFromCat = billsByCategory[cat];
      const billsPaid = billsFromCat?.paid ?? 0;
      out[cat] = tx + billsPaid;
    });
    return out;
  }, [spentByCategory, billsByCategory]);

  const { budgets, loading, setLimit } = useBudgets(userId, familyId, currentMonth, currentYear, spentByCategoryForBudget);

  const displayList = useMemo(() => {
    return expenseCategories.map((cat) => {
      const txSpent = spentByCategory[cat] ?? 0;
      const billsFromCat = billsByCategory[cat];
      const billsPaid = billsFromCat?.paid ?? 0;
      const billsPending = billsFromCat?.pending ?? 0;
      const total = txSpent + billsPaid + billsPending;
      const limit = budgets.find((b) => b.category === cat)?.limit ?? 0;
      return {
        id: budgets.find((b) => b.category === cat)?.id ?? cat,
        name: cat,
        icon: categoryIcons[cat] || '📦',
        limit,
        spent: txSpent,
        billsPaid,
        billsPending,
        total,
      };
    });
  }, [budgets, spentByCategory, billsByCategory]);

  const income = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalGastos = useMemo(() => {
    const txExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const billsPaid = monthBills.filter((b) => b.paid_at).reduce((s, b) => s + b.amount, 0);
    return txExpense + billsPaid;
  }, [transactions, monthBills]);
  const totalDividasPendentes = useMemo(
    () => monthBills.filter((b) => !b.paid_at).reduce((s, b) => s + b.amount, 0),
    [monthBills]
  );
  const sobraReal = income - totalGastos - totalDividasPendentes;

  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState('');
  const [addExpenseCategory, setAddExpenseCategory] = useState<string | null>(null);
  const [addExpenseValue, setAddExpenseValue] = useState('');
  const [addExpenseDesc, setAddExpenseDesc] = useState('');

  const getBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-danger';
    if (pct >= 90) return 'bg-danger';
    if (pct >= 70) return 'bg-warning';
    return 'bg-success';
  };

  const handleSaveLimit = async () => {
    if (editCategory == null || !userId) return;
    try {
      await setLimit(editCategory, parseCurrencyInput(limitValue || '0') || 0);
      setEditCategory(null);
      setLimitValue('');
      toast.success('Limite atualizado.');
    } catch {
      toast.error('Erro ao salvar.');
    }
  };

  const handleAddExpense = async () => {
    if (!addExpenseCategory || !userId) return;
    const amount = parseCurrencyInput(addExpenseValue || '0');
    if (amount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      await addTransaction({
        family_id: familyId ?? null,
        description: addExpenseDesc.trim() || `Gasto em ${addExpenseCategory}`,
        amount,
        type: 'expense',
        category: addExpenseCategory,
        date: today,
        recurring: false,
        frequency: null,
        note: 'Via Orçamento',
      });
      await refetchTx();
      setAddExpenseCategory(null);
      setAddExpenseValue('');
      setAddExpenseDesc('');
      toast.success('Gasto registrado!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    }
  };

  const billsPaid = monthBills.filter((b) => b.paid_at);
  const billsPending = monthBills.filter((b) => !b.paid_at);

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-bold text-foreground">Orçamento</h1>

      {/* Card de resumo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-4 shadow-card"
      >
        <h3 className="font-semibold text-foreground text-sm mb-4">Resumo do mês</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Renda</p>
            <p className="text-lg font-bold text-success">R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total gasto</p>
            <p className="text-lg font-bold text-danger">R$ {totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dívidas pendentes</p>
            <p className="text-lg font-bold text-warning">R$ {totalDividasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sobra real</p>
            <p className={`text-lg font-bold ${sobraReal >= 0 ? 'text-success' : 'text-danger'}`}>
              R$ {sobraReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Dívidas do mês */}
      {monthBills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl p-4 shadow-card"
        >
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <FileText size={18} /> Dívidas do mês
          </h3>
          <div className="space-y-2">
            {monthBills.map((b) => (
              <div key={b.id} className="flex justify-between items-center text-sm">
                <span className="text-foreground">{b.description}</span>
                <span className={b.paid_at ? 'text-success' : 'text-danger'}>
                  R$ {b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {b.paid_at ? ' ✓' : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-border text-sm">
            <span className="text-success">Total pago: R$ {billsPaid.reduce((s, b) => s + b.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-danger font-semibold">Total pendente: R$ {totalDividasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </motion.div>
      )}

      {/* Gráfico e categorias */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          {displayList.some((b) => b.total > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-4 shadow-card"
            >
              <h3 className="font-semibold text-foreground text-sm mb-4">Despesas por categoria</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayList.filter((b) => b.total > 0).map((b) => ({ name: b.name, value: b.total }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {displayList.filter((b) => b.total > 0).map((_, i) => (
                        <Cell key={i} fill={categoryColors[displayList.filter((b) => b.total > 0)[i].name] || '#666'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(234 33% 14%)',
                        border: '1px solid hsl(234 20% 20%)',
                        borderRadius: 8,
                        color: '#F8F8F8',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {displayList.map((b, i) => {
              const pct = b.limit > 0 ? Math.round((b.total / b.limit) * 100) : 0;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4 shadow-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{b.icon}</span>
                      <span className="text-sm font-medium text-foreground">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setAddExpenseCategory(b.name);
                          setAddExpenseValue('');
                          setAddExpenseDesc('');
                        }}
                      >
                        <Plus size={12} className="mr-1" /> Registrar gasto
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditCategory(b.name);
                          setLimitValue(b.limit ? b.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
                        }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Pencil size={12} /> Definir limite
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    <span>
                      Gasto real: R$ {b.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {b.billsPaid > 0 && ` + Dívidas pagas: R$ ${b.billsPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      {b.billsPending > 0 && ` + Pendentes: R$ ${b.billsPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </span>
                    <span className="block text-[10px] opacity-80">Total: R$ {b.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {b.limit > 0 ? (
                    <>
                      <div className="flex justify-between text-xs mb-1">
                        <span>R$ {b.total.toLocaleString('pt-BR')} / R$ {b.limit.toLocaleString('pt-BR')}</span>
                        <span className={pct >= 90 ? 'text-danger' : pct >= 70 ? 'text-warning' : 'text-success'}>{pct}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getBarColor(pct)}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem limite definido</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal definir limite */}
      <Dialog open={!!editCategory} onOpenChange={() => setEditCategory(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Definir Orçamento</DialogTitle>
            <DialogDescription>Limite para {editCategory}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <CurrencyInput
              value={limitValue}
              onChange={(v) => setLimitValue(v)}
              placeholder="Valor limite (R$)"
              className="bg-muted border-border"
            />
            <Button onClick={handleSaveLimit} disabled={!limitValue} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal registrar gasto */}
      <Dialog open={!!addExpenseCategory} onOpenChange={() => setAddExpenseCategory(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar gasto</DialogTitle>
            <DialogDescription>Adicionar despesa em {addExpenseCategory}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-foreground">Valor (R$)</label>
              <CurrencyInput
                value={addExpenseValue}
                onChange={(v) => setAddExpenseValue(v)}
                placeholder="0,00"
                className="mt-1 bg-muted border-border"
              />
            </div>
            <div>
              <label className="text-sm text-foreground">Descrição</label>
              <Input
                value={addExpenseDesc}
                onChange={(e) => setAddExpenseDesc(e.target.value)}
                placeholder="Ex: Almoço, Uber"
                className="mt-1 bg-muted border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExpenseCategory(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAddExpense} disabled={!addExpenseValue || parseCurrencyInput(addExpenseValue || '0') <= 0}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
