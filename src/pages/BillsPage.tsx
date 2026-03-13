import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2, AlertCircle, Check, FileText, StickyNote } from 'lucide-react';
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
import { useBills, type BillApp } from '@/hooks/useBills';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CurrencyInput, parseCurrencyInput } from '@/components/CurrencyInput';
import { RECEIVING_CATEGORIES, PAYING_CATEGORIES } from '@/data/bills-categories';
import { BILL_TYPES } from '@/data/bill-types';
import { useScore } from '@/hooks/useScore';
import { celebrateProgress } from '@/lib/confetti';
import { checkAndUnlock } from '@/lib/achievements';
import { BillRenewalModal } from '@/components/bills/BillRenewalModal';
import { BillNotesSheet } from '@/components/bills/BillNotesSheet';
import type { BillType } from '@/types/database';

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
  const [notesBillId, setNotesBillId] = useState<string | null>(null);
  const [renewalBill, setRenewalBill] = useState<BillApp | null>(null);
  const [form, setForm] = useState({
    description: '',
    amountDisplay: '',
    due_day: 15,
    type: 'expense' as 'income' | 'expense',
    category: '',
    is_variable: false,
    bill_type: 'fixed' as BillType,
    installment_total: 1,
    installment_current: 1,
    total_amount: 0,
    card_limit: 0,
    card_closing_day: 15,
    creditor_name: '',
  });
  const [filterBillType, setFilterBillType] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const upcoming = upcomingDue(7, 'expense');
  const recebimentos = bills.filter((b) => b.type === 'income');
  const contasPagar = bills.filter((b) => b.type === 'expense');

  const getNextMonthName = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('pt-BR', { month: 'long' });
  };

  const contasPagarFiltered = useMemo(() => {
    let list = contasPagar;
    if (filterStatus === 'pending') list = list.filter((b) => !b.paid_at && b.status !== 'paid');
    else if (filterStatus === 'paid') list = list.filter((b) => !!b.paid_at || b.status === 'paid');
    else if (filterStatus === 'overdue') list = list.filter((b) => {
      if (b.paid_at) return false;
      const today = new Date().getDate();
      return b.due_day < today;
    });
    if (filterBillType !== 'all') list = list.filter((b) => (b.bill_type || (b.is_variable ? 'variable' : 'fixed')) === filterBillType);
    if (filterPeriod === 'this_month') {
      const today = new Date().getDate();
      list = list.filter((b) => !b.paid_at && b.due_day >= today);
    } else if (filterPeriod === 'next_month') {
      const today = new Date().getDate();
      list = list.filter((b) => !b.paid_at && b.due_day < today);
    } else if (filterPeriod === 'overdue') {
      const today = new Date().getDate();
      list = list.filter((b) => !b.paid_at && b.due_day < today);
    }
    return list;
  }, [contasPagar, filterBillType, filterPeriod, filterStatus]);

  const resetForm = () => {
    setForm({
      description: '',
      amountDisplay: '',
      due_day: 15,
      type: 'expense',
      category: PAYING_CATEGORIES[0],
      is_variable: false,
      bill_type: 'fixed',
      installment_total: 1,
      installment_current: 1,
      total_amount: 0,
      card_limit: 0,
      card_closing_day: 15,
      creditor_name: '',
    });
    setEditingId(null);
  };

  const getDaysUntilDue = (dueDay: number) => {
    const today = new Date().getDate();
    if (dueDay >= today) return dueDay - today;
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    return lastDay - today + dueDay;
  };

  const getCountdownBadge = (dueDay: number, paidAt?: string | null) => {
    if (paidAt) return { label: 'Quitada', color: 'bg-success/20 text-success', days: -1 };
    const days = getDaysUntilDue(dueDay);
    if (days < 0) return { label: 'Vencida', color: 'bg-destructive/20 text-destructive', days };
    if (days === 0) return { label: 'Vence hoje', color: 'bg-warning/20 text-warning', days: 0 };
    if (days <= 3) return { label: 'Vencendo', color: 'bg-destructive/20 text-destructive', days };
    if (days <= 7) return { label: 'Vencendo', color: 'bg-warning/20 text-warning', days };
    return { label: 'Em dia', color: 'bg-success/20 text-success', days };
  };

  const getBillTypeBadge = (b: BillApp) => {
    const t = b.bill_type || (b.is_variable ? 'variable' : 'fixed');
    const info = BILL_TYPES.find((x) => x.value === t);
    return info ? `${info.icon} ${info.label}` : 'Dívida';
  };

  const progressBar = (current: number, total: number) => {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const filled = Math.floor(pct / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${pct}%`;
  };

  const handleOpenAdd = (type: 'income' | 'expense') => {
    resetForm();
    setForm((f) => ({
      ...f,
      type,
      category: type === 'income' ? RECEIVING_CATEGORIES[0] : PAYING_CATEGORIES[0],
    }));
    setModalOpen(true);
  };

  const handleOpenEdit = (b: BillApp) => {
    setForm({
      description: b.description,
      amountDisplay: b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      due_day: b.due_day,
      type: b.type,
      category: b.category ?? PAYING_CATEGORIES[0],
      is_variable: b.bill_type === 'variable' || b.is_variable ?? false,
      bill_type: (b.bill_type as BillType) ?? 'fixed',
      installment_total: b.installment_total ?? b.installments ?? 1,
      installment_current: b.installment_current ?? b.paid_installments ?? 0,
      total_amount: b.total_amount ?? b.amount,
      card_limit: b.card_limit ?? 0,
      card_closing_day: b.card_closing_day ?? 15,
      creditor_name: b.creditor_name ?? '',
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
    if (amount <= 0 && form.bill_type !== 'variable') {
      toast.error('Informe um valor válido.');
      return;
    }
    if (form.due_day < 1 || form.due_day > 31) {
      toast.error('Dia inválido.');
      return;
    }
    try {
      const payload: Parameters<typeof addBill>[0] = {
        description: form.description.trim(),
        amount: form.bill_type === 'installment' ? (form.total_amount || amount) / (form.installment_total || 1) : (form.bill_type === 'variable' ? amount || 0 : amount),
        due_day: form.bill_type === 'variable' ? 1 : form.due_day,
        type: form.type,
        category: form.category || null,
        is_recurring: form.bill_type !== 'variable',
        is_variable: form.bill_type === 'variable',
        bill_type: form.bill_type,
        installment_total: form.installment_total,
        installment_current: form.installment_current,
      };
      if (form.bill_type === 'credit_card') {
        payload.card_limit = form.card_limit || null;
        payload.card_closing_day = form.card_closing_day;
      }
      if (form.bill_type === 'informal') payload.creditor_name = form.creditor_name || null;
      if (form.bill_type === 'installment') payload.total_amount = form.total_amount || amount;
      if (editingId) {
        await updateBill(editingId, payload as Partial<BillApp>);
        toast.success('Atualizado.');
      } else {
        await addBill(payload);
        toast.success(form.type === 'income' ? 'Recebimento adicionado.' : 'Dívida adicionada.');
      }
      setModalOpen(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    }
  };

  const handleMarkAsPaid = async (b: BillApp) => {
    if (b.type !== 'expense') return;
    const billType = b.bill_type || (b.is_variable ? 'variable' : 'fixed');
    const total = b.installment_total ?? b.installments ?? 1;
    const current = b.installment_current ?? b.paid_installments ?? 0;
    const isLast = current + 1 >= total;
    try {
      await markAsPaid(b.id);
      if (user?.id && isLast) {
        addScore(user.id, 'debt_paid');
        checkAndUnlock(user.id, 'quitador');
      }
      if (isLast) {
        celebrateProgress(100);
        toast.success('🎉 Dívida quitada! Parabéns!');
        if (billType === 'fixed') {
          setRenewalBill(b);
        }
      } else {
        toast.success(`Parcela ${current + 1}/${total} paga!`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao marcar.');
    }
  };

  const handleRenew = async () => {
    if (!renewalBill || !userId) return;
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    try {
      await addBill({
        description: renewalBill.description,
        amount: renewalBill.amount,
        due_day: renewalBill.due_day,
        type: 'expense',
        category: renewalBill.category,
        is_recurring: true,
        bill_type: 'fixed',
      });
      toast.success(`Renovado para ${getNextMonthName()}!`);
      setRenewalBill(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao renovar.');
    }
  };

  const handleEndRenewal = () => {
    if (renewalBill) {
      updateBill(renewalBill.id, { status: 'inactive' });
      setRenewalBill(null);
    }
  };

  const handleSaveNotes = async (billId: string, notes: { text: string; tags: string[]; created_at: string }[], tags: string[]) => {
    await updateBill(billId, { notes_history: notes, tags });
    setNotesBillId(null);
  };

  const notesBill = notesBillId ? bills.find((b) => b.id === notesBillId) : null;

  const renderBillCard = (b: BillApp, isExpense: boolean) => {
    const badge = isExpense ? getCountdownBadge(b.due_day, b.paid_at) : null;
    const total = b.installment_total ?? b.installments ?? 1;
    const current = b.installment_current ?? b.paid_installments ?? 0;
    const isPaid = !!b.paid_at || (total > 1 && current >= total);
    const billType = b.bill_type || (b.is_variable ? 'variable' : 'fixed');
    const displayAmount = b.bill_type === 'credit_card' && b.card_limit
      ? `${b.amount.toLocaleString('pt-BR')} / ${b.card_limit.toLocaleString('pt-BR')}`
      : b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
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
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{getBillTypeBadge(b)}</span>
            {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>{badge.label}</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            Dia {b.due_day} • {b.category || '—'}
            {total > 1 && !isPaid && ` • Parcela ${current + 1}/${total}`}
            {b.bill_type === 'credit_card' && b.card_limit && (
              <span className="block mt-1">
                <span className="text-muted-foreground">Limite: </span>
                {progressBar(b.amount, Number(b.card_limit))}
              </span>
            )}
            {b.bill_type === 'informal' && b.total_amount && b.paid_amount != null && (
              <span className="block mt-1">{progressBar(Number(b.paid_amount), Number(b.total_amount))}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-semibold ${b.type === 'income' ? 'text-success' : 'text-danger'}`}>
            {b.type === 'income' ? '+' : '-'} R$ {displayAmount}
          </span>
          {isExpense && !isPaid && (
            <>
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handleMarkAsPaid(b)}>
                <Check size={14} className="mr-1" /> Pagar
              </Button>
              <button
                type="button"
                onClick={() => setNotesBillId(b.id)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                title="Anotações"
              >
                <StickyNote size={14} />
              </button>
            </>
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
  };

  const categories = form.type === 'income' ? RECEIVING_CATEGORIES : PAYING_CATEGORIES;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText size={24} /> Dívidas e recebimentos
        </h1>
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
          <Button variant="outline" size="sm" onClick={() => user?.email && sendBillsReminder(upcoming.map((b) => ({ description: b.description, amount: b.amount, due_day: b.due_day })))}>
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
          ) : recebimentos.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-sm mb-4">Nenhum recebimento.</p>
              <Button size="sm" onClick={() => handleOpenAdd('income')}>
                <Plus size={14} className="mr-2" /> Adicionar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">{recebimentos.map((b) => renderBillCard(b, false))}</div>
          )}
        </TabsContent>

        <TabsContent value="contas" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={filterBillType}
                onChange={(e) => setFilterBillType(e.target.value)}
                className="h-9 rounded-md border border-input bg-muted px-3 text-sm"
              >
                <option value="all">Todas</option>
                {BILL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="h-9 rounded-md border border-input bg-muted px-3 text-sm"
              >
                <option value="all">Todos os períodos</option>
                <option value="this_month">Este mês</option>
                <option value="next_month">Próximo mês</option>
                <option value="overdue">Vencidas</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-muted px-3 text-sm"
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
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
          ) : contasPagarFiltered.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-sm mb-4">Nenhuma dívida a pagar.</p>
              <Button size="sm" onClick={() => handleOpenAdd('expense')}>
                <Plus size={14} className="mr-2" /> Adicionar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">{contasPagarFiltered.map((b) => renderBillCard(b, true))}</div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir dívida"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (deleteId) {
            await deleteBill(deleteId);
            toast.success('Excluído.');
            setDeleteId(null);
          }
        }}
      />

      <BillRenewalModal
        open={!!renewalBill}
        onOpenChange={(o) => !o && setRenewalBill(null)}
        billName={renewalBill?.description ?? ''}
        nextMonth={getNextMonthName()}
        onRenew={handleRenew}
        onEnd={handleEndRenewal}
      />

      {notesBill && (
        <BillNotesSheet
          open={!!notesBillId}
          onOpenChange={(o) => !o && setNotesBillId(null)}
          billName={notesBill.description}
          amount={notesBill.amount}
          notes={notesBill.notes_history ?? []}
          tags={notesBill.tags ?? []}
          onSave={(notes, tags) => notesBillId && handleSaveNotes(notesBillId, notes, tags)}
        />
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : form.type === 'income' ? 'Adicionar recebimento' : 'Adicionar dívida'}
            </DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {form.type === 'expense' && (
              <div>
                <label className="text-sm text-foreground">Tipo de dívida</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {BILL_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, bill_type: t.value as BillType }))}
                      className={`p-2 rounded border text-left text-xs ${
                        form.bill_type === t.value ? 'border-primary bg-primary/10' : 'border-border bg-muted'
                      }`}
                    >
                      <span className="font-medium">{t.icon} {t.label}</span>
                      <p className="text-muted-foreground mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm text-foreground">Descrição</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={form.bill_type === 'informal' ? 'Ex: João' : 'Ex: Aluguel'}
                className="mt-1 bg-muted border-border"
              />
            </div>
            {form.bill_type === 'informal' && (
              <div>
                <label className="text-sm text-foreground">Nome da pessoa</label>
                <Input
                  value={form.creditor_name}
                  onChange={(e) => setForm((f) => ({ ...f, creditor_name: e.target.value }))}
                  placeholder="Quem você deve"
                  className="mt-1 bg-muted border-border"
                />
              </div>
            )}
            {form.bill_type !== 'variable' && (
              <>
                <div>
                  <label className="text-sm text-foreground">
                    {form.bill_type === 'installment' ? 'Valor total (R$)' : form.bill_type === 'credit_card' ? 'Valor fatura (R$)' : 'Valor (R$)'}
                  </label>
                  <CurrencyInput
                    value={form.amountDisplay}
                    onChange={(v) => setForm((f) => ({ ...f, amountDisplay: v, total_amount: parseCurrencyInput(v || '0') }))}
                    placeholder="0,00"
                    className="mt-1 bg-muted border-border"
                  />
                </div>
                {form.bill_type === 'installment' && (
                  <div className="flex gap-2">
                    <div>
                      <label className="text-sm text-foreground">Parcela atual</label>
                      <Input
                        type="number"
                        min={1}
                        value={form.installment_current}
                        onChange={(e) => setForm((f) => ({ ...f, installment_current: Math.max(1, Number(e.target.value) || 1) }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-foreground">Total parcelas</label>
                      <Input
                        type="number"
                        min={1}
                        value={form.installment_total}
                        onChange={(e) => setForm((f) => ({ ...f, installment_total: Math.max(1, Number(e.target.value) || 1) }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                )}
                {form.bill_type === 'credit_card' && (
                  <div className="flex gap-2">
                    <div>
                      <label className="text-sm text-foreground">Limite (R$)</label>
                      <CurrencyInput
                        value={form.card_limit ? form.card_limit.toLocaleString('pt-BR') : ''}
                        onChange={(v) => setForm((f) => ({ ...f, card_limit: parseCurrencyInput(v || '0') }))}
                        placeholder="0,00"
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-foreground">Dia fechamento</label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={form.card_closing_day}
                        onChange={(e) => setForm((f) => ({ ...f, card_closing_day: Math.min(31, Math.max(1, Number(e.target.value) || 15)) }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            {form.bill_type === 'variable' && (
              <div>
                <label className="text-sm text-foreground">Valor estimado (R$) — opcional</label>
                <CurrencyInput
                  value={form.amountDisplay}
                  onChange={(v) => setForm((f) => ({ ...f, amountDisplay: v }))}
                  placeholder="0,00"
                  className="mt-1 bg-muted border-border"
                />
              </div>
            )}
            {form.bill_type !== 'variable' && (
              <div>
                <label className="text-sm text-foreground">Dia do vencimento</label>
                <select
                  value={form.due_day}
                  onChange={(e) => setForm((f) => ({ ...f, due_day: Number(e.target.value) }))}
                  className="mt-1 w-full h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm text-foreground">Categoria</label>
              <select
                value={form.category || categories[0]}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
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
