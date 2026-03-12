import { useState } from 'react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { categoryIcons, categoryColors, expenseCategories, incomeCategories } from '@/data/mock-data';
import type { TransactionApp } from '@/hooks/useTransactions';
import { VoiceTransaction } from '@/components/VoiceTransaction';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency, parseCurrencyInput } from '@/lib/currency';
import { toast } from 'sonner';
import { getFraseEconomia } from '@/lib/quotes';
import type { ParsedTransaction } from '@/lib/gemini';

export default function TransactionsPage() {
  const { userId, familyId } = useViewMode();
  const [filterSource, setFilterSource] = useState<'all' | 'manual' | 'pluggy'>('all');
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions(userId, familyId, { source: filterSource });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionApp | null>(null);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txRecurring, setTxRecurring] = useState(false);
  const [txFreq, setTxFreq] = useState<'monthly' | 'weekly'>('monthly');
  const [txDayOfMonth, setTxDayOfMonth] = useState<string>('');
  const [amountInput, setAmountInput] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = transactions
    .filter(t => filterType === 'all' || t.type === filterType)
    .filter(t => filterCategory === 'all' || t.category === filterCategory)
    .filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  const openNew = () => {
    setEditingTx(null);
    setTxType('expense'); setTxDesc(''); setTxAmount(0); setAmountInput(''); setTxDate(new Date().toISOString().split('T')[0]);
    setTxCategory(''); setTxNote(''); setTxRecurring(false); setTxDayOfMonth('');
    setShowModal(true);
  };

  const openNewWithParsed = (p: ParsedTransaction) => {
    setEditingTx(null);
    setTxType(p.type); setTxDesc(p.description); setTxAmount(p.amount); setAmountInput(formatCurrency(p.amount));
    setTxDate(p.date); setTxCategory(p.category); setTxNote(''); setTxRecurring(false); setTxDayOfMonth('');
    setShowModal(true);
  };

  const openEdit = (t: TransactionApp) => {
    setEditingTx(t);
    setTxType(t.type); setTxDesc(t.description); setTxAmount(t.amount); setAmountInput(formatCurrency(t.amount));
    setTxDate(t.date); setTxCategory(t.category); setTxNote(t.note || '');
    setTxRecurring(!!t.recurring); setTxFreq(t.frequency || 'monthly');
    const dayMatch = t.note?.match(/Dia do mês:\s*(\d+)/);
    setTxDayOfMonth(dayMatch ? dayMatch[1] : '');
    setShowModal(true);
  };

  const noteWithDay = txRecurring && txDayOfMonth ? (txNote ? `${txNote} | Dia do mês: ${txDayOfMonth}` : `Dia do mês: ${txDayOfMonth}`) : txNote;
  const handleSave = async () => {
    const amount = typeof txAmount === 'number' ? txAmount : parseCurrencyInput(amountInput || '0');
    try {
      if (editingTx) {
        await updateTransaction(editingTx.id, { type: txType, description: txDesc, amount, date: txDate, category: txCategory, note: noteWithDay || undefined, recurring: txRecurring, frequency: txRecurring ? txFreq : undefined });
        toast.success('Transação atualizada.');
      } else {
        await addTransaction({ type: txType, description: txDesc, amount, date: txDate, category: txCategory, note: noteWithDay || undefined, recurring: txRecurring, frequency: txRecurring ? txFreq : undefined, family_id: familyId ?? undefined });
        if (txType === 'income') {
          toast.success(getFraseEconomia());
        } else {
          toast.success('Transação adicionada.');
        }
      }
      setShowModal(false);
    } catch {
      toast.error('Erro ao salvar.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTransaction(deleteId);
      toast.success('Transação excluída.');
      setDeleteId(null);
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  const categories = txType === 'expense' ? expenseCategories : incomeCategories;

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold text-foreground">Transações</h1>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar transação..."
            className="pl-10 bg-muted border-border" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'income', 'expense'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {t === 'all' ? 'Todas' : t === 'income' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
          {(['all', 'manual', 'pluggy'] as const).map(s => (
            <button key={s} onClick={() => setFilterSource(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterSource === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {s === 'all' ? 'Todas' : s === 'manual' ? 'Manuais' : 'Importadas'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <AnimatePresence>
            {filtered.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: (categoryColors[t.category] || '#666') + '20' }}>
                    {categoryIcons[t.category] || '📦'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                      {t.description}
                      {t.source === 'pluggy' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary">
                                Importado
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Transação importada do banco</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('pt-BR')} · {t.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {t.type === 'income' ? '+' : '-'}R${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {t.source !== 'pluggy' && (
                    <button onClick={() => openEdit(t)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                  )}
                  <button onClick={() => setDeleteId(t.id)} className="p-1 text-muted-foreground hover:text-danger"><Trash2 size={14} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <VoiceTransaction onParsed={openNewWithParsed} disabled={!userId} />

      <button data-tour="fab-transaction" onClick={openNew}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-glow flex items-center justify-center z-40 hover:scale-105 transition-transform">
        <Plus size={24} />
      </button>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir transação"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
      />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingTx ? 'Editar' : 'Nova'} Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex bg-muted rounded-lg p-1">
              <button type="button" onClick={() => { setTxType('expense'); setTxCategory(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${txType === 'expense' ? 'bg-danger text-foreground' : 'text-muted-foreground'}`}>
                Despesa
              </button>
              <button type="button" onClick={() => { setTxType('income'); setTxCategory(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${txType === 'income' ? 'bg-success text-primary-foreground' : 'text-muted-foreground'}`}>
                Receita
              </button>
            </div>
            <Input value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="Descrição" className="bg-muted border-border" />
            <Input
              value={amountInput || (txAmount ? formatCurrency(txAmount) : '')}
              onChange={e => { const v = e.target.value; setAmountInput(v); setTxAmount(parseCurrencyInput(v)); }}
              placeholder="R$ 0,00"
              className="bg-muted border-border"
            />
            <Input value={txDate} onChange={e => setTxDate(e.target.value)} type="date" className="bg-muted border-border" />
            <Select value={txCategory} onValueChange={setTxCategory}>
              <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {categories.map(c => <SelectItem key={c} value={c}>{categoryIcons[c]} {c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={txNote} onChange={e => setTxNote(e.target.value)} placeholder="Observação (opcional)" className="bg-muted border-border" />
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Gasto fixo ou variável?</p>
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                <button type="button" onClick={() => { setTxRecurring(false); setTxDayOfMonth(''); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium ${!txRecurring ? 'bg-background text-foreground shadow' : 'text-muted-foreground'}`}>
                  Variável (gasto pontual)
                </button>
                <button type="button" onClick={() => setTxRecurring(true)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium ${txRecurring ? 'bg-background text-foreground shadow' : 'text-muted-foreground'}`}>
                  Fixo (se repete todo mês)
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">💡 Gastos fixos aparecem automaticamente todo mês no seu orçamento.</p>
            </div>
            {txRecurring && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Dia do mês que costuma ocorrer</label>
                  <Input type="number" min={1} max={28} placeholder="Ex: 5" value={txDayOfMonth} onChange={e => setTxDayOfMonth(e.target.value)} className="bg-muted border-border" />
                </div>
                <Select value={txFreq} onValueChange={v => setTxFreq(v as 'monthly' | 'weekly')}>
                  <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <Button onClick={handleSave} disabled={!txDesc || (!amountInput && txAmount === 0) || !txCategory}
              className="w-full bg-primary text-primary-foreground font-semibold">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
