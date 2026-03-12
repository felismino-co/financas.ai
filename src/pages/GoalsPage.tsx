import { useState } from 'react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useGoals } from '@/hooks/useGoals';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { GoalApp } from '@/hooks/useGoals';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { celebrateGoal } from '@/lib/confetti';
import { getFraseEconomia, getFraseMetaAtingida } from '@/lib/quotes';

const emojiOptions = ['🎯', '✈️', '🛡️', '💻', '🏠', '🚗', '📚', '💍', '🎮', '🏖️'];
const colorOptions = ['#00D4AA', '#7C3AED', '#F39C12', '#E74C3C', '#3498DB', '#E91E63'];

export default function GoalsPage() {
  const { userId, familyId } = useViewMode();
  const { goals, loading, addGoal, updateGoal, deleteGoal, updateProgress } = useGoals(userId, familyId);
  const [showModal, setShowModal] = useState(false);
  const [showAddValue, setShowAddValue] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [editingGoal, setEditingGoal] = useState<GoalApp | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#00D4AA');

  const totalNeeded = goals.reduce((s, g) => s + g.targetAmount - g.currentAmount, 0);
  const monthsLeft = 12;
  const monthlyNeeded = Math.ceil(totalNeeded / monthsLeft);

  const openNew = () => {
    setEditingGoal(null);
    setName(''); setEmoji('🎯'); setTarget(''); setCurrent(''); setDeadline(''); setColor('#00D4AA');
    setShowModal(true);
  };

  const openEdit = (g: GoalApp) => {
    setEditingGoal(g);
    setName(g.name); setEmoji(g.emoji); setTarget(String(g.targetAmount));
    setCurrent(String(g.currentAmount)); setDeadline(g.deadline); setColor(g.color);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, { name, emoji, color, targetAmount: Number(target), currentAmount: Number(current || 0), deadline });
        toast.success('Meta atualizada.');
      } else {
        await addGoal({ name, emoji, color, targetAmount: Number(target), currentAmount: Number(current || 0), deadline, family_id: familyId ?? undefined });
        toast.success('Meta criada.');
      }
      setShowModal(false);
    } catch {
      toast.error('Erro ao salvar.');
    }
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      await deleteGoal(goalToDelete);
      toast.success('Meta excluída.');
      setGoalToDelete(null);
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  const handleAddValue = async () => {
    if (!showAddValue || !addAmount) return;
    const g = goals.find(x => x.id === showAddValue);
    if (!g) return;
    const newAmount = g.currentAmount + Number(addAmount);
    const metaAtingida = newAmount >= g.targetAmount;
    try {
      await updateProgress(showAddValue, newAmount);
      setShowAddValue(null);
      setAddAmount('');
      if (metaAtingida) {
        celebrateGoal();
        toast.success(getFraseMetaAtingida(), { duration: 5000 });
      } else {
        toast.success(getFraseEconomia());
      }
    } catch {
      toast.error('Erro ao adicionar.');
    }
  };

  const getStatus = (g: GoalApp) => {
    const pct = g.currentAmount / g.targetAmount;
    const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000);
    if (daysLeft < 0) return { label: 'Atrasada', color: 'text-danger' };
    if (pct < 0.3 && daysLeft < 90) return { label: 'Atenção', color: 'text-warning' };
    return { label: 'No prazo', color: 'text-success' };
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Metas</h1>
        <Button onClick={openNew} size="sm" className="bg-primary text-primary-foreground text-xs" disabled={!userId}>
          <Plus size={14} className="mr-1" /> Nova Meta
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-ai rounded-xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <PiggyBank className="text-secondary-foreground" size={20} />
          <span className="text-sm font-semibold text-secondary-foreground">Dica do FinanceIA</span>
        </div>
        <p className="text-sm text-secondary-foreground/90">
          {goals.length > 0 ? (
            <>Se você guardar <strong>R$ {monthlyNeeded.toLocaleString('pt-BR')}</strong> por mês, atingirá todas as suas metas no prazo!</>
          ) : (
            <>Crie metas para acompanhar sua evolução e manter o foco.</>
          )}
        </p>
      </motion.div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          goals.map((g, i) => {
            const pct = Math.round((g.currentAmount / g.targetAmount) * 100);
            const status = getStatus(g);
            const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000));
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4 shadow-card" style={{ borderLeftColor: g.color, borderLeftWidth: 4 }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{g.name}</p>
                      <p className={`text-xs font-medium ${status.color}`}>{status.label} · {daysLeft} dias restantes</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(g)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                    <button type="button" onClick={() => setGoalToDelete(g.id)} className="p-1 text-muted-foreground hover:text-danger"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>R$ {g.currentAmount.toLocaleString('pt-BR')} / R$ {g.targetAmount.toLocaleString('pt-BR')}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                </div>
                <Button size="sm" variant="outline" onClick={() => { setShowAddValue(g.id); setAddAmount(''); }}
                  className="w-full text-xs border-border text-foreground hover:bg-muted">
                  Adicionar valor
                </Button>
              </motion.div>
            );
          })
        )}
      </div>

      <Dialog open={!!showAddValue} onOpenChange={() => setShowAddValue(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Adicionar Valor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="Valor (R$)" type="number" className="bg-muted border-border" />
            <Button onClick={handleAddValue} disabled={!addAmount} className="w-full bg-primary text-primary-foreground font-semibold">Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground">{editingGoal ? 'Editar' : 'Nova'} Meta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da meta" className="bg-muted border-border" />
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Emoji</label>
              <div className="flex gap-2 flex-wrap">
                {emojiOptions.map(e => (
                  <button key={e} type="button" onClick={() => setEmoji(e)}
                    className={`text-2xl p-1.5 rounded-lg transition-colors ${emoji === e ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-muted'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <Input value={target} onChange={e => setTarget(e.target.value)} placeholder="Valor total (R$)" type="number" className="bg-muted border-border" />
            <Input value={current} onChange={e => setCurrent(e.target.value)} placeholder="Valor já guardado (R$)" type="number" className="bg-muted border-border" />
            <Input value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Data limite" type="date" className="bg-muted border-border" />
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Cor</label>
              <div className="flex gap-2">
                {colorOptions.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <Button onClick={handleSave} disabled={!name || !target} className="w-full bg-primary text-primary-foreground font-semibold">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={goalToDelete !== null}
        onOpenChange={(open) => !open && setGoalToDelete(null)}
        title="Excluir meta"
        description="Tem certeza? O progresso desta meta será perdido."
        confirmLabel="Excluir"
        onConfirm={handleDeleteGoal}
      />
    </div>
  );
}
