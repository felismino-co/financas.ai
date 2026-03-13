import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useBills } from '@/hooks/useBills';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CurrencyInput, parseCurrencyInput } from '@/components/CurrencyInput';
import { RECEIVING_CATEGORIES, PAYING_CATEGORIES } from '@/data/bills-categories';
import { useScore } from '@/hooks/useScore';
import { celebrateProgress } from '@/lib/confetti';
import { checkAndUnlock } from '@/lib/achievements';

export default function BillsPage() {
  const { user } = useAuth();
  const { userId, familyId } = useViewMode();
  const { bills, loading, error, addBill, updateBill, deleteBill, markAsPaid, upcomingDue } = useBills(userId, familyId);
  const { addScore } = useScore();
  const { sendBillsReminder } = useAlerts();
  const [activeTab, setActiveTab] = useState<'recebimentos' | 'contas'>('contas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    amountDisplay: '',
    due_day: 15,
    type: 'expense' as 'income' | 'expense',
    category: '',
    is_variable: false,
  });
  const [filterBill, setFilterBill] = useState<'all' | 'monthly' | 'this_month'>('all');
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'variable'>('all');

  const upcoming = upcomingDue(7, 'expense');
  const recebimentos = bills.filter((b) => b.type === 'income');
  const contasPagar = bills.filter((b) => b.type === 'expense');

  const resetForm = () => {
    setForm({
      description: '',
      amountDisplay: '',
      due_day: 15,
      type: 'expense',
      category: '',
      is_variable: false,
    });
    setEditingId(null);
  };

  const getDaysUntilDue = (dueDay: number) => {
    const today = new Date();
    const todayDay = today.getDate();
    if (dueDay >= todayDay) return dueDay - todayDay;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return (lastDay - todayDay) + dueDay;
  };

  const getCountdownBadge = (dueDay: number, paidAt?: string | null) => {
    if (paidAt) return { label: 'Pago', color: 'bg-success/20 text-success', days: -1 };
    const days = getDaysUntilDue(dueDay);
    if (days === 0) return { label: 'Vence hoje', color: 'bg-warning/20 text-warning', days: 0 };
    if (days <= 3) return { label: 'Vencendo', color: 'bg-destructive/20 text-destructive', days };
    if (days <= 7) return { label: 'Vencendo', color: 'bg-warning/20 text-warning', days };
    return { label: 'Em dia', color: 'bg-success/20 text-success', days };
  };

  const contasPagarFiltered = useMemo(() => {
    let list = contasPagar.filter((b) => !b.paid_at);
    if (filterBill === 'monthly') list = list.filter((b) => b.is_recurring);
    if (filterBill === 'this_month') {
      const today = new Date().getDate();
      list = list.filter((b) => b.due_day >= today);
    }
    if (filterType === 'fixed') list = list.filter((b) => !b.is_variable);
    if (filterType === 'variable') list = list.filter((b) => b.is_variable);
    return list;
  }, [contasPagar, filterBill, filterType]);

  const handleOpenAdd = (type: 'income' | 'expense') => {
    resetForm();
    setForm((f) => ({
      ...f,
      type,
      category: type === 'income' ? RECEIVING_CATEGORIES[0] : PAYING_CATEGORIES[0],
    }));
    setModalOpen(true);
  };

  const handleOpenEdit = (b: { id: string; description: string; amount: number; due_day: number; type: 'income' | 'expense'; category: string | null; is_variable?: boolean }) => {
    setForm({
      description: b.description,
      amountDisplay: b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      due_day: b.due_day,
      type: b.type,
      category: b.category ?? (b.type === 'income' ? RECEIVING_CATEGORIES[0] : PAYING_CATEGORIES[0]),
      is_variable: b.is_variable ?? false,
    });
    setEditingId(b.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const amount = parseCurrencyInput(form.amountDisplay || '0');
    if (!form.description.trim()) {
      toast.error('Informe a descrição.');
      return;
    }
    if (amount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    if (form.due_day < 1 || form.due_day > 31) {
      toast.error('Dia inválido.');
      return;
    }
    try {
      if (editingId) {
        await updateBill(editingId, {
          description: form.description.trim(),
          amount,
          due_day: form.due_day,
          type: form.type,
          category: form.category || null,
          is_variable: form.is_variable,
        });
        toast.success('Atualizado.');
      } else {
        await addBill({
          description: form.description.trim(),
          amount,
          due_day: form.due_day,
          type: form.type,
          category: form.category || null,
          is_recurring: true,
          is_variable: form.is_variable,
        });
        toast.success(form.type === 'income' ? 'Recebimento adicionado.' : 'Dívida adicionada.');
      }
      setModalOpen(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBill(deleteId);
      toast.success('Excluído.');
      setDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro.');
    }
  };

  const handleSendReminder = () => {
    if (upcoming.length && user?.email) {
      sendBillsReminder(upcoming.map((b) => ({ description: b.description, amount: b.amount, due_day: b.due_day })));
      toast.success('Lembrete enviado por e-mail.');
    }
  };

  const handleMarkAsPaid = async (b: { id: string; installments?: number; paid_installments?: number; type: string }) => {
    if (b.type !== 'expense') return;
    const installments = b.installments ?? 1;
    const prevPaid = b.paid_installments ?? 0;
    const prevPct = installments > 0 ? Math.round((prevPaid / installments) * 100) : 0;
    const newPaid = prevPaid + 1;
    const newPct = installments > 0 ? Math.round((newPaid / installments) * 100) : 100;
    const fullyPaid = newPaid >= installments;
    try {
      await markAsPaid(b.id);
      if (user?.id && fullyPaid) {
        addScore(user.id, 'debt_paid');
        checkAndUnlock(user.id, 'quitador');
      }
      if (fullyPaid) {
        celebrateProgress(100);
        toast.success('🎉 Dívida quitada! Parabéns!');
      } else {
        for (const m of [25, 50, 75]) {
          if (prevPct < m && newPct >= m) {
            celebrateProgress(m);
            toast.success(`🎉 Você já pagou ${m}% dessa dívida!`);
            break;
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao marcar.');
    }
  };

  const renderList = (items: typeof bills, emptyMsg: string, isExpense = false) => {
    if (items.length === 0) {
      return (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm mb-4">{emptyMsg}</p>
          <Button size="sm" onClick={() => handleOpenAdd(activeTab === 'recebimentos' ? 'income' : 'expense')}>
            <Plus size={14} className="mr-2" /> Adicionar
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((b) => {
          const badge = isExpense ? getCountdownBadge(b.due_day, b.paid_at) : null;
          const installments = b.installments ?? 1;
          const paidInst = b.paid_installments ?? 0;
          const isPaid = !!b.paid_at || (installments > 1 && paidInst >= installments);
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-card border border-border rounded-xl p-4 flex items-center justify-between ${isPaid ? 'opacity-60' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{b.description}</p>
                  {b.is_variable && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Variável</span>}
                  {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>{badge.label}</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Dia {b.due_day} • {b.category || '—'}
                  {installments > 1 && !isPaid && ` • Parcela ${paidInst + 1}/${installments}`}
                  {isExpense && badge && badge.days >= 0 && !isPaid && (
                    <span className="ml-1"> • Vence em {badge.days} dias</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-semibold ${b.type === 'income' ? 'text-success' : 'text-danger'}`}>
                  {b.type === 'income' ? '+' : '-'} R$ {b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {isExpense && !isPaid && (
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handleMarkAsPaid(b)}>
                    <Check size={14} className="mr-1" /> Pagar
                  </Button>
                )}
                <button type="button" onClick={() => handleOpenEdit(b)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => setDeleteId(b.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const categories = form.type === 'income' ? RECEIVING_CATEGORIES : PAYING_CATEGORIES;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dívidas e recebimentos</h1>
        <p className="text-sm text-muted-foreground">Receitas fixas e dívidas a pagar</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {upcoming.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-warning" />
            <div>
              <p className="font-semibold text-foreground text-sm">Próximos vencimentos</p>
              <p className="text-xs text-muted-foreground">{upcoming.length} dívida(s) nos próximos 7 dias</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSendReminder}>
            Enviar lembrete
          </Button>
        </motion.div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'recebimentos' | 'contas')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="recebimentos" className="flex items-center gap-2">
            <TrendingUp size={16} /> Recebimentos
          </TabsTrigger>
          <TabsTrigger value="contas" className="flex items-center gap-2">
            <TrendingDown size={16} /> Dívidas a pagar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recebimentos" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => handleOpenAdd('income')}>
              <Plus size={14} className="mr-2" /> Adicionar recebimento
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            renderList(
              recebimentos,
              'Nenhum recebimento. Ex: aluguel de imóvel, salário, vendas a receber.'
            )
          )}
        </TabsContent>

        <TabsContent value="contas" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={filterBill}
                onChange={(e) => setFilterBill(e.target.value as 'all' | 'monthly' | 'this_month')}
                className="h-9 rounded-md border border-input bg-muted px-3 text-sm"
              >
                <option value="all">Todas</option>
                <option value="monthly">Dívidas mensais</option>
                <option value="this_month">Deste mês</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'fixed' | 'variable')}
                className="h-9 rounded-md border border-input bg-muted px-3 text-sm"
              >
                <option value="all">Fixas e variáveis</option>
                <option value="fixed">Fixas</option>
                <option value="variable">Variáveis</option>
              </select>
            </div>
            <Button size="sm" onClick={() => handleOpenAdd('expense')}>
              <Plus size={14} className="mr-2" /> Adicionar dívida
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            renderList(
              contasPagarFiltered,
              'Nenhuma dívida a pagar. Ex: aluguel, luz, internet.',
              true
            )
          )}
        </TabsContent>
      </Tabs>

        <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir dívida"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
      />

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-card border-border" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : form.type === 'income' ? 'Adicionar recebimento' : 'Adicionar dívida'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {form.type === 'income' ? 'Preencha os dados do recebimento' : 'Preencha os dados da dívida'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-foreground">Descrição</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={form.type === 'income' ? 'Ex: Aluguel do apartamento' : 'Ex: Aluguel'}
                className="mt-1 bg-muted border-border"
              />
            </div>
            <div>
              <label className="text-sm text-foreground">Valor (R$)</label>
              <CurrencyInput
                value={form.amountDisplay}
                onChange={(v) => setForm((f) => ({ ...f, amountDisplay: v }))}
                placeholder="0,00"
                className="mt-1 bg-muted border-border"
              />
            </div>
            <div>
              <label className="text-sm text-foreground">Dia do vencimento</label>
              <select
                value={form.due_day}
                onChange={(e) => setForm((f) => ({ ...f, due_day: Number(e.target.value) }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-foreground">Categoria</label>
              <select
                value={form.category || categories[0]}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {form.type === 'expense' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_variable}
                  onChange={(e) => setForm((f) => ({ ...f, is_variable: e.target.checked }))}
                />
                <span className="text-sm text-foreground">Dívida variável (ex: mercado, combustível)</span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editingId ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
