import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Pencil, Trash2, AlertCircle } from 'lucide-react';
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
import { useViewMode } from '@/contexts/ViewModeContext';
import { useBills } from '@/hooks/useBills';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function BillsPage() {
  const { user } = useAuth();
  const { userId, familyId } = useViewMode();
  const { bills, loading, addBill, updateBill, deleteBill, upcomingDue } = useBills(userId, familyId);
  const { sendBillsReminder } = useAlerts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    due_day: 15,
    type: 'expense' as 'income' | 'expense',
    category: '',
  });

  const upcoming = upcomingDue(7);

  const resetForm = () => {
    setForm({
      description: '',
      amount: '',
      due_day: 15,
      type: 'expense',
      category: '',
    });
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (b: { id: string; description: string; amount: number; due_day: number; type: 'income' | 'expense'; category: string | null }) => {
    setForm({
      description: b.description,
      amount: String(b.amount),
      due_day: b.due_day,
      type: b.type,
      category: b.category ?? '',
    });
    setEditingId(b.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!form.description || isNaN(amount) || amount <= 0 || form.due_day < 1 || form.due_day > 31) {
      toast.error('Preencha todos os campos corretamente.');
      return;
    }
    try {
      if (editingId) {
        await updateBill(editingId, {
          description: form.description,
          amount,
          due_day: form.due_day,
          type: form.type,
          category: form.category || null,
        });
        toast.success('Conta atualizada.');
      } else {
        await addBill({
          description: form.description,
          amount,
          due_day: form.due_day,
          type: form.type,
          category: form.category || null,
          is_recurring: true,
        });
        toast.success('Conta adicionada.');
      }
      setModalOpen(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta conta?')) return;
    try {
      await deleteBill(id);
      toast.success('Conta excluída.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  };

  const handleSendReminder = () => {
    if (upcoming.length && user?.email) {
      sendBillsReminder(upcoming.map((b) => ({ description: b.description, amount: b.amount, due_day: b.due_day })));
      toast.success('Lembrete enviado por e-mail.');
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText size={24} /> Contas a pagar e receber
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie suas contas fixas</p>
        </div>
        <Button onClick={handleOpenAdd} size="sm">
          <Plus size={16} className="mr-2" /> Nova conta
        </Button>
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
              <p className="text-xs text-muted-foreground">
                {upcoming.length} conta(s) nos próximos 7 dias
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSendReminder}>
            Enviar lembrete
          </Button>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-xl p-8 text-center"
        >
          <FileText size={48} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Nenhuma conta cadastrada.</p>
          <Button onClick={handleOpenAdd}>Adicionar primeira conta</Button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {bills.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{b.description}</p>
                <p className="text-xs text-muted-foreground">
                  Dia {b.due_day} • {b.type === 'income' ? 'Receita' : 'Despesa'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${b.type === 'income' ? 'text-success' : 'text-danger'}`}>
                  {b.type === 'income' ? '+' : '-'} R$ {b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(b)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-foreground">Descrição</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Aluguel"
                className="mt-1 bg-muted border-border"
              />
            </div>
            <div>
              <label className="text-sm text-foreground">Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0,00"
                className="mt-1 bg-muted border-border"
              />
            </div>
            <div>
              <label className="text-sm text-foreground">Dia do vencimento</label>
              <Select
                value={String(form.due_day)}
                onValueChange={(v) => setForm((f) => ({ ...f, due_day: Number(v) }))}
              >
                <SelectTrigger className="mt-1 bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-foreground">Tipo</label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'income' | 'expense' }))}
              >
                <SelectTrigger className="mt-1 bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>{editingId ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
