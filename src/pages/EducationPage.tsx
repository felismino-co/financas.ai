import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, Quote } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getQuoteOfDay, getRandomQuote, QUOTES } from '@/lib/quotes';
import { useAuthState } from '@/contexts/AuthStateContext';

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
  const [quoteOfDay] = useState(() => getQuoteOfDay());
  const [randomQuote, setRandomQuote] = useState(() => getRandomQuote());

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
    </div>
  );
}
