import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RECEIVABLE_TAGS } from '@/data/receivable-types';
import type { ReceivableNote } from '@/hooks/useReceivables';
import { Share2 } from 'lucide-react';

interface ReceivableNotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  amount: number;
  notes: ReceivableNote[];
  tags: string[];
  onSave: (notes: ReceivableNote[], tags: string[]) => void | Promise<void>;
}

export function ReceivableNotesSheet({
  open,
  onOpenChange,
  description,
  amount,
  notes,
  tags,
  onSave,
}: ReceivableNotesSheetProps) {
  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const [saving, setSaving] = useState(false);

  const handleAddNote = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const newNote: ReceivableNote = {
      text: text.trim(),
      tags: [...selectedTags],
      created_at: new Date().toISOString(),
    };
    await onSave([...notes, newNote], selectedTags);
    setText('');
    setSaving(false);
  };

  const toggleTag = (value: string) => {
    setSelectedTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  const shareViaWhatsApp = () => {
    const tagLabel = RECEIVABLE_TAGS.find((t) => t.value === selectedTags[0])?.label ?? 'Pendente';
    const msg = `📋 ${description} — R$${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nStatus: ${tagLabel}\nNota: ${text || '(sem nota)'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>📝 Anotações — {description}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-foreground">Tags rápidas</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {RECEIVABLE_TAGS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleTag(t.value)}
                  className={`text-xs px-2 py-1 rounded border ${
                    selectedTags.includes(t.value)
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-foreground">Nova anotação</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Adicione uma nota..."
              className="mt-1 bg-muted border-border min-h-[80px]"
            />
            <Button size="sm" className="mt-2" onClick={handleAddNote} disabled={saving || !text.trim()}>
              Adicionar
            </Button>
          </div>
          {notes.length > 0 && (
            <div>
              <label className="text-sm text-foreground">Histórico</label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {notes.map((n, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-muted border border-border">
                    <p className="text-foreground">{n.text}</p>
                    <p className="text-muted-foreground mt-1">
                      {n.tags.join(', ')} • {new Date(n.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full" onClick={shareViaWhatsApp}>
            <Share2 size={14} className="mr-2" /> Compartilhar via WhatsApp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
