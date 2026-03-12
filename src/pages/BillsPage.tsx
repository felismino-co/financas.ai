import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useBills } from '@/hooks/useBills';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CurrencyInput, parseCurrencyInput } from '@/components/CurrencyInput';
import { RECEIVING_CATEGORIES, PAYING_CATEGORIES } from '@/data/bills-categories';

export default function BillsPage() {
  const { user } = useAuth();
  const { userId, familyId } = useViewMode();
  const { bills, loading, addBill, updateBill, deleteBill, upcomingDue } = useBills(userId, familyId);
  const { sendBillsReminder } = useAlerts();
  const [activeTab, setActiveTab] = useState<'recebimentos' | 'contas'>('contas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    amountDisplay: '',
    due_day: 15,
    type: 'expense' as 'income' | 'expense',
    category: '',
  });

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
    });
    setEditingId(null);
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

  const handleOpenEdit = (b: { id: string; description: string; amount: number; due_day: number; type: 'income' | 'expense'; category: string | null }) => {
    setForm({
      description: b.description,
      amountDisplay: b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      due_day: b.due_day,
      type: b.type,
      category: b.category ?? (b.type === 'income' ? RECEIVING_CATEGORIES[0] : PAYING_CATEGORIES[0]),
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
        });
        toast.success(form.type === 'income' ? 'Recebimento adicionado.' : 'Conta adicionada.');
      }
      setModalOpen(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir?')) return;
    try {
      await deleteBill(id);
      toast.success('Excluído.');
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

  const renderList = (items: typeof bills, emptyMsg: string) => {
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
        {items.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-foreground">{b.description}</p>
              <p className="text-xs text-muted-foreground">
                Dia {b.due_day} • {b.category || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${b.type === 'income' ? 'text-success' : 'text-danger'}`}>
                {b.type === 'income' ? '+' : '-'} R$ {b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <button type="button" onClick={() => handleOpenEdit(b)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                <Pencil size={14} />
              </button>
              <button type="button" onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const categories = form.type === 'income' ? RECEIVING_CATEGORIES : PAYING_CATEGORIES;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Contas e recebimentos</h1>
        <p className="text-sm text-muted-foreground">Receitas fixas e contas a pagar</p>
      </div>

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
              <p className="text-xs text-muted-foreground">{upcoming.length} conta(s) nos próximos 7 dias</p>
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
            <TrendingDown size={16} /> Contas a pagar
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
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => handleOpenAdd('expense')}>
              <Plus size={14} className="mr-2" /> Adicionar conta
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
              contasPagar,
              'Nenhuma conta a pagar. Ex: aluguel, luz, internet.'
            )
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : form.type === 'income' ? 'Adicionar recebimento' : 'Adicionar conta a pagar'}
            </DialogTitle>
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
              <Select value={String(form.due_day)} onValueChange={(v) => setForm((f) => ({ ...f, due_day: Number(v) }))}>
                <SelectTrigger className="mt-1 bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-foreground">Categoria</label>
              <Select value={form.category || categories[0]} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1 bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
