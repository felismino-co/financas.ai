import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, Quote, Volume2, Square, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getQuoteOfDay, getRandomQuote, QUOTES } from '@/lib/quotes';
import { useAuthState } from '@/contexts/AuthStateContext';
import { useAuth } from '@/hooks/useAuth';
import { FIVE_LAWS } from '@/data/five-laws';
import { getLawsRead, markLawAsRead } from '@/lib/achievements';
import { toast } from 'sonner';

const DICAS = [
  { title: 'Reserve 10% antes de gastar', desc: 'Ao receber, transfira 10% para uma conta separada. O resto é o que você pode gastar.' },
  { title: 'Regra 50/30/20', desc: '50% necessidades, 30% desejos, 20% poupança.' },
  { title: 'Evite compras por impulso', desc: 'Espere 24h antes de compras acima de R$100.' },
  { title: 'Monte uma reserva de emergência', desc: 'Objetivo: 3 a 6 meses de gastos.' },
  { title: 'Pague as cartas em dia', desc: 'Evite juros e melhore seu score.' },
  { title: 'Compare preços', desc: 'Pesquise antes de comprar. A economia pode ser grande.' },
];

export default function EducationPage() {
  const { profile } = useAuthState();
  const { user } = useAuth();
  const [quoteOfDay] = useState(() => getQuoteOfDay());
  const [randomQuote, setRandomQuote] = useState(() => getRandomQuote());
  const [lawsRead, setLawsRead] = useState<number[]>([]);
  const [lawSheetOpen, setLawSheetOpen] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<typeof FIVE_LAWS[0] | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const fetchLawsRead = useCallback(async () => {
    if (!user?.id) return;
    const read = await getLawsRead(user.id);
    setLawsRead(read);
  }, [user?.id]);

  useEffect(() => {
    fetchLawsRead();
  }, [fetchLawsRead]);

  const handleOpenLaw = (law: typeof FIVE_LAWS[0]) => {
    setSelectedLaw(law);
    setLawSheetOpen(true);
  };

  const handleSpeak = () => {
    if (!selectedLaw) return;
    const text = `${selectedLaw.title}. ${selectedLaw.quote} ${selectedLaw.text}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const handleMarkAsRead = async () => {
    if (!user?.id || !selectedLaw) return;
    const ok = await markLawAsRead(user.id, selectedLaw.id);
    if (ok) {
      const newRead = lawsRead.includes(selectedLaw.id) ? lawsRead : [...lawsRead, selectedLaw.id];
      setLawsRead(newRead);
      toast.success('Lei marcada como lida!');
      if (newRead.length >= 5) toast.success('💡 Insígnia "Educado" desbloqueada!', { duration: 4000 });
    }
  };

  const dicasPersonalizadas = profile?.financial_profile
    ? DICAS.filter((_, i) => i < 4)
    : DICAS;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen size={24} /> Educação Financeira
        </h1>
        <p className="text-sm text-muted-foreground">Aprenda e melhore sua saúde financeira</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-4 shadow-card space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Lightbulb size={18} className="text-warning" /> As 5 Leis do Dinheiro
        </h3>
        <p className="text-xs text-muted-foreground">Clique em cada lei para ler, ouvir e marcar como lida.</p>
        <div className="space-y-2">
          {FIVE_LAWS.map((law) => {
            const isRead = lawsRead.includes(law.id);
            return (
              <button
                key={law.id}
                type="button"
                onClick={() => handleOpenLaw(law)}
                className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  isRead ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border hover:bg-muted/50'
                }`}
              >
                <span className="font-medium text-foreground text-sm">{law.title}</span>
                {isRead && <Check size={16} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </motion.div>

      <Tabs defaultValue="frase" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="frase">Frase do dia</TabsTrigger>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
          <TabsTrigger value="dicas">Dicas personalizadas</TabsTrigger>
        </TabsList>

        <TabsContent value="frase" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6 shadow-card"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Quote size={20} /> Frase do dia
            </div>
            <p className="text-lg text-foreground mb-2">&quot;{quoteOfDay.text}&quot;</p>
            {quoteOfDay.author && (
              <p className="text-sm text-muted-foreground">— {quoteOfDay.author}</p>
            )}
            <button
              type="button"
              onClick={() => setRandomQuote(getRandomQuote())}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Ver outra frase
            </button>
          </motion.div>
        </TabsContent>

        <TabsContent value="biblioteca" className="mt-4">
          <div className="space-y-3">
            {QUOTES.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-4 shadow-card"
              >
                <p className="text-sm text-foreground">&quot;{q.text}&quot;</p>
                {q.author && (
                  <p className="text-xs text-muted-foreground mt-2">— {q.author}</p>
                )}
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dicas" className="mt-4">
          <div className="space-y-3">
            {dicasPersonalizadas.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <Lightbulb size={20} className="text-warning shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{d.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{d.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={lawSheetOpen} onOpenChange={(o) => { setLawSheetOpen(o); if (!o) handleStop(); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedLaw?.title}</SheetTitle>
          </SheetHeader>
          {selectedLaw && (
            <div className="mt-4 space-y-4">
              <p className="text-lg text-primary font-medium">&quot;{selectedLaw.quote}&quot;</p>
              <p className="text-sm text-foreground">{selectedLaw.text}</p>
              <div className="flex flex-wrap gap-2 pt-4">
                {speaking ? (
                  <Button variant="outline" size="sm" onClick={handleStop}>
                    <Square size={14} className="mr-1" /> Parar
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleSpeak}>
                    <Volume2 size={14} className="mr-1" /> Ouvir
                  </Button>
                )}
                {!lawsRead.includes(selectedLaw.id) && (
                  <Button size="sm" onClick={handleMarkAsRead}>
                    <Check size={14} className="mr-1" /> Marcar como lida
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
