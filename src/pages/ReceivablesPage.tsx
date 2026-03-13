import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Check, Wallet, StickyNote } from 'lucide-react';
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
import { useReceivables, type Receivable } from '@/hooks/useReceivables';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ReceivableNotesSheet } from '@/components/receivables/ReceivableNotesSheet';
import { toast } from 'sonner';
import { CurrencyInput, parseCurrencyInput } from '@/components/CurrencyInput';
import { RECEIVABLES_CATEGORIES } from '@/data/receivables-categories';
import { RECEIVABLE_TYPES } from '@/data/receivable-types';
import { celebrateProgress } from '@/lib/confetti';

export default function ReceivablesPage() {
  const { receivables, loading, error, addReceivable, updateReceivable, markAsReceived, deleteReceivable } = useReceivables();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notesId, setNotesId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    amountDisplay: '',
    due_date: '',
    frequency: 'once' as 'once' | 'monthly' | 'recurring',
    receivable_type: 'recurring' as string,
    installments: 1,
    installmentValueDisplay: '',
    category: RECEIVABLES_CATEGORIES[0],
    notes: '',
    debtor_name: '',
    client_name: '',
    contract_end_date: '',
    service_description: '',
  });

  const pending = receivables.filter((r) => r.status === 'pending');
  const received = receivables.filter((r) => r.status === 'received');

  const getDaysUntil = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(dueDate + 'T00:00:00').getTime();
    const now = new Date(today + 'T00:00:00').getTime();
    return Math.ceil((due - now) / 86400000);
  };

  const getCountdownColor = (days: number) => {
    if (days < 0) return 'text-destructive';
    if (days <= 3) return 'text-destructive';
    if (days <= 7) return 'text-warning';
    return 'text-success';
  };

  const getStatusBadge = (r: Receivable) => {
    if (r.status === 'received') return { label: 'Recebido', color: 'bg-success/20 text-success' };
    const days = getDaysUntil(r.due_date);
    if (days === null) return { label: 'Pendente', color: 'bg-muted text-muted-foreground' };
    if (days < 0) return { label: 'Atrasado', color: 'bg-destructive/20 text-destructive' };
    if (days <= 7) return { label: 'Próximo', color: 'bg-warning/20 text-warning' };
    return { label: 'Pendente', color: 'bg-muted text-muted-foreground' };
  };

  useEffect(() => {
    if (loading || pending.length === 0) return;
    const soon = pending.filter((r) => {
      const d = getDaysUntil(r.due_date);
      return d !== null && d >= 0 && d <= 5;
    });
    if (soon.length > 0) {
      const total = soon.reduce((s, r) => s + r.amount, 0);
      toast.info(`Você tem R$ ${total.toLocaleString('pt-BR')} a receber nos próximos 5 dias!`, { duration: 5000 });
    }
  }, [loading, pending]);

  const resetForm = () => {
    setForm({
      description: '',
      amountDisplay: '',
      due_date: '',
      frequency: 'once',
      receivable_type: 'recurring',
      installments: 1,
      installmentValueDisplay: '',
      category: RECEIVABLES_CATEGORIES[0],
      notes: '',
      debtor_name: '',
      client_name: '',
      contract_end_date: '',
      service_description: '',
    });
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (r: Receivable) => {
    setForm({
      description: r.description,
      amountDisplay: r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      due_date: r.due_date || '',
      frequency: r.frequency,
      receivable_type: r.receivable_type || 'recurring',
      installments: r.installment_total ?? r.installments,
      installmentValueDisplay: r.installment_value ? r.installment_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
      category: (r.category as typeof RECEIVABLES_CATEGORIES[number]) || RECEIVABLES_CATEGORIES[0],
      notes: r.notes || '',
      debtor_name: r.debtor_name || '',
      client_name: r.client_name || '',
      contract_end_date: r.contract_end_date || '',
      service_description: r.service_description || '',
    });
    setEditingId(r.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const amount = parseCurrencyInput(form.amountDisplay || '0');
    if (!form.description.trim()) {
      toast.error('Informe a descrição.');
      return;
    }
    if (amount <= 0 && form.receivable_type !== 'custom') {
      toast.error('Informe um valor válido.');
      return;
    }
    try {
      const payload = {
        description: form.description.trim(),
        amount: form.installments > 1 ? (parseCurrencyInput(form.installmentValueDisplay || '0') || amount / form.installments) : amount,
        due_date: form.due_date || null,
        frequency: form.frequency,
        receivable_type: form.receivable_type,
        installments: form.installments,
        installment_total: form.installments,
        installment_value: form.installments > 1 ? (parseCurrencyInput(form.installmentValueDisplay || '0') || amount / form.installments) : null,
        total_amount: form.installments > 1 ? amount : null,
        category: form.category,
        notes: form.notes.trim() || null,
        status: 'pending' as const,
        debtor_name: form.debtor_name.trim() || null,
        client_name: form.client_name.trim() || null,
        contract_end_date: form.contract_end_date || null,
        service_description: form.service_description.trim() || null,
      };
      if (editingId) {
        await updateReceivable(editingId, payload);
        toast.success('Atualizado.');
      } else {
        await addReceivable(payload);
        toast.success('Recebível adicionado.');
      }
      setModalOpen(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReceivable(deleteId);
      toast.success('Excluído.');
      setDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro.');
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Wallet size={24} /> A Receber
        </h1>
        <p className="text-sm text-muted-foreground">Valores que você tem a receber</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleOpenAdd}>
          <Plus size={14} className="mr-2" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : receivables.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Nenhum valor a receber. Adicione salários, vendas, investimentos ou valores que alguém te deve.
          </p>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus size={14} className="mr-2" /> Adicionar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {receivables.map((r) => {
            const badge = getStatusBadge(r);
            const days = getDaysUntil(r.due_date);
            const isReceived = r.status === 'received';
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-card border border-border rounded-xl p-4 flex items-center justify-between ${isReceived ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">{r.description}</p>
                    {RECEIVABLE_TYPES.find((t) => t.value === r.receivable_type) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {RECEIVABLE_TYPES.find((t) => t.value === r.receivable_type)!.icon} {RECEIVABLE_TYPES.find((t) => t.value === r.receivable_type)!.label}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.category || '—'}
                    {r.due_date && ` • ${new Date(r.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                    {(r.installment_total ?? r.installments) > 1 && !isReceived && (
                      <span className="ml-1"> • Parcela {(r.installment_current ?? 0) + 1}/{r.installment_total ?? r.installments}</span>
                    )}
                    {days !== null && !isReceived && (
                      <span className={`ml-1 font-medium ${getCountdownColor(days)}`}>
                        {days < 0 ? `Atrasado ${Math.abs(days)} dias` : days === 0 ? 'Hoje!' : `Faltam ${days} dias`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-success">
                    R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {!isReceived && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 px-2" onClick={async () => {
                        await markAsReceived(r.id);
                        const total = r.installment_total ?? r.installments ?? 1;
                        const current = r.installment_current ?? 0;
                        if (current + 1 >= total) {
                          celebrateProgress(100);
                          toast.success('🎉 Recebimento confirmado!');
                        }
                      }}>
                        <Check size={14} className="mr-1" /> Recebido
                      </Button>
                      <button type="button" onClick={() => setNotesId(r.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Anotações">
                        <StickyNote size={14} />
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => handleOpenEdit(r)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => setDeleteId(r.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir recebível"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
      />

      {notesId && (() => {
        const r = receivables.find((x) => x.id === notesId);
        return r ? (
          <ReceivableNotesSheet
            open={!!notesId}
            onOpenChange={(o) => !o && setNotesId(null)}
            description={r.description}
            amount={r.amount}
            notes={r.notes_history ?? []}
            tags={r.tags ?? []}
            onSave={async (notes, tags) => {
              await updateReceivable(notesId, { notes_history: notes, tags });
              setNotesId(null);
            }}
          />
        ) : null;
      })()}

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Adicionar'} recebível</DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados do valor a receber</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-foreground">Tipo de recebimento</label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                {RECEIVABLE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, receivable_type: t.value }))}
                    className={`p-2 rounded border text-left text-xs ${
                      form.receivable_type === t.value ? 'border-primary bg-primary/10' : 'border-border bg-muted'
                    }`}
                  >
                    <span className="font-medium">{t.icon} {t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-foreground">Descrição</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={form.receivable_type === 'debt' ? 'Ex: João me deve' : form.receivable_type === 'client' ? 'Ex: Empresa XYZ' : 'Ex: Salário, Venda'}
                className="mt-1 bg-muted border-border"
              />
            </div>
            {form.receivable_type === 'debt' && (
              <div>
                <label className="text-sm text-foreground">Nome da pessoa</label>
                <Input
                  value={form.debtor_name}
                  onChange={(e) => setForm((f) => ({ ...f, debtor_name: e.target.value }))}
                  placeholder="Quem te deve"
                  className="mt-1 bg-muted border-border"
                />
              </div>
            )}
            {form.receivable_type === 'client' && (
              <>
                <div>
                  <label className="text-sm text-foreground">Nome do cliente</label>
                  <Input
                    value={form.client_name}
                    onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                    placeholder="Cliente"
                    className="mt-1 bg-muted border-border"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground">Data fim do contrato</label>
                  <Input
                    type="date"
                    value={form.contract_end_date}
                    onChange={(e) => setForm((f) => ({ ...f, contract_end_date: e.target.value }))}
                    className="mt-1 bg-muted border-border"
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground">Descrição do serviço</label>
                  <Input
                    value={form.service_description}
                    onChange={(e) => setForm((f) => ({ ...f, service_description: e.target.value }))}
                    placeholder="Ex: Consultoria mensal"
                    className="mt-1 bg-muted border-border"
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-sm text-foreground">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
              >
                {RECEIVABLES_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-foreground">Valor total (R$)</label>
              <CurrencyInput
                value={form.amountDisplay}
                onChange={(v) => setForm((f) => ({ ...f, amountDisplay: v }))}
                placeholder="0,00"
                className="mt-1 bg-muted border-border"
              />
            </div>
            <div>
              <label className="text-sm text-foreground">Parcelado?</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="parcelado"
                    checked={form.installments <= 1}
                    onChange={() => setForm((f) => ({ ...f, installments: 1, installmentValueDisplay: '' }))}
                  />
                  Não
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="parcelado"
                    checked={form.installments > 1}
                    onChange={() => setForm((f) => ({ ...f, installments: 2 }))}
                  />
                  Sim
                </label>
              </div>
              {form.installments > 1 && (
                <div className="mt-2 flex gap-2">
                  <Input
                    type="number"
                    min={2}
                    value={form.installments}
                    onChange={(e) => setForm((f) => ({ ...f, installments: Math.max(2, Number(e.target.value) || 2) }))}
                    placeholder="Parcelas"
                    className="w-24 bg-muted border-border"
                  />
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Valor por parcela</label>
                    <CurrencyInput
                      value={form.installmentValueDisplay}
                      onChange={(v) => setForm((f) => ({ ...f, installmentValueDisplay: v }))}
                      placeholder="0,00"
                      className="mt-0.5 bg-muted border-border"
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-foreground">Data do recebimento</label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="mt-1 bg-muted border-border"
              />
            </div>
            <div>
              <label className="text-sm text-foreground">Frequência</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as 'once' | 'monthly' | 'recurring' }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
              >
                <option value="once">Único</option>
                <option value="monthly">Mensal</option>
                <option value="recurring">Recorrente</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-foreground">Observação</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Anotações..."
                className="mt-1 w-full min-h-[60px] rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
              />
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
