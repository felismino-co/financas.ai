import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { generateChatResponse } from '@/lib/gemini';
import { useAuthState } from '@/contexts/AuthStateContext';
import { useAICredits } from '@/hooks/useAICredits';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const CHIPS = [
  'Como economizar mais?',
  'Analise meus gastos',
  'Dicas para atingir minha meta',
  'O que priorizar este mês?',
];

const CHAT_CREDIT_COST = 1;

export function AIChat() {
  const { user } = useAuth();
  const { profile } = useAuthState();
  const { remaining, consumeCredit, isUnlimited } = useAICredits();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const canSend = (isUnlimited || remaining >= CHAT_CREDIT_COST) && !loading;

  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || !canSend) return;

    if (!isUnlimited && remaining < CHAT_CREDIT_COST) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Você não tem créditos suficientes. Faça upgrade para continuar.' }]);
      return;
    }

    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);

    try {
      const reply = await generateChatResponse(msg, {
        monthlyIncome: profile?.monthly_income,
        financialGoal: profile?.financial_goal,
        recentSummary: `Perfil: ${profile?.financial_profile ?? 'não definido'}`,
      });
      if (!isUnlimited) {
        const ok = await consumeCredit('chat_guidado');
        if (!ok) {
          setMessages((m) => [...m, { role: 'assistant', text: 'Resposta gerada, mas não foi possível registrar o crédito. Tente novamente.' }]);
          setLoading(false);
          return;
        }
      }
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      if (user?.id) {
        await supabase.from('insights').insert({
          user_id: user.id,
          type: 'chat',
          title: 'Chat com IA',
          description: `Pergunta: ${msg.slice(0, 80)}... | Resposta: ${reply.slice(0, 150)}...`,
          impact: null,
          read: false,
        });
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: e instanceof Error ? e.message : 'Erro ao processar. Verifique se a API está configurada (VITE_GEMINI_API_KEY) e tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" data-tour="fab-transaction" className="rounded-full h-12 w-12 border-primary/50 bg-primary/5 hover:bg-primary/10">
          <MessageCircle size={22} />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left">Chat com IA</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {isUnlimited ? 'Créditos ilimitados' : `${remaining} créditos`}
          </p>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Escolha um tema ou digite sua pergunta:</p>
                <div className="flex flex-wrap gap-2">
                  {CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => sendMessage(chip)}
                      disabled={!canSend}
                      className="text-xs px-3 py-2 rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm max-w-[90%]',
                  m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                )}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 size={16} className="animate-spin" /> Pensando...
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Sua pergunta..."
              className="flex-1 bg-muted border-border"
              disabled={!canSend}
            />
            <Button size="icon" onClick={() => sendMessage(input)} disabled={!canSend}>
              <Send size={18} />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
