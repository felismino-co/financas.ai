import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { mockInsights } from '@/data/mock-data';
import type { Insight } from '@/data/mock-data';
import { AICreditsBar } from '@/components/AICreditsBar';

const simulations = [
  { question: 'E se eu guardar R$200 a mais por mês?', result: 'Suas metas seriam atingidas 3 meses antes. Em 12 meses, você teria R$2.400 a mais.' },
  { question: 'E se eu cortar gastos com lazer em 30%?', result: 'Economia de ~R$70/mês. Sua reserva de emergência atingiria a meta 2 meses antes.' },
  { question: 'E se eu quitar minha maior dívida agora?', result: 'Você economizaria R$480 em juros ao longo de 12 meses e melhoraria seu score em +8 pontos.' },
];

export default function InsightsPage() {
  const [insights] = useState<Insight[]>(mockInsights);
  const [selectedSim, setSelectedSim] = useState<number | null>(null);
  const [customSim, setCustomSim] = useState('');
  const [showCustomResult, setShowCustomResult] = useState(false);

  const iconMap = { alert: <AlertTriangle size={18} />, opportunity: <Lightbulb size={18} />, achievement: <TrendingUp size={18} />, projection: <Eye size={18} /> };
  const colorMap = { alert: 'border-danger', opportunity: 'border-warning', achievement: 'border-success', projection: 'border-secondary' };
  const labelMap = { alert: 'Alerta', opportunity: 'Oportunidade', achievement: 'Conquista', projection: 'Projeção' };

  const simChartData = [
    { month: 'Atual', value: 7000 }, { month: '+2m', value: 7400 }, { month: '+4m', value: 8200 },
    { month: '+6m', value: 9500 }, { month: '+8m', value: 11000 }, { month: '+10m', value: 12800 }, { month: '+12m', value: 15000 },
  ];

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-center space-y-1 flex-1">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="text-secondary" size={24} />
            <h1 className="text-xl font-bold text-foreground">Sua IA Financeira</h1>
          </div>
          <p className="text-sm text-muted-foreground">Análises e recomendações personalizadas para você</p>
        </div>
        <AICreditsBar />
      </div>

      {(['alert', 'opportunity', 'achievement', 'projection'] as const).map(type => {
        const items = insights.filter(i => i.type === type);
        if (!items.length) return null;
        return (
          <div key={type} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {iconMap[type]} {labelMap[type]}s
            </h3>
            {items.map((ins, i) => (
              <motion.div key={ins.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className={`bg-card border-l-4 ${colorMap[type]} border border-border rounded-xl p-4 shadow-card`}>
                <p className="text-sm font-medium text-foreground mb-1">{ins.icon} {ins.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{ins.description}</p>
              </motion.div>
            ))}
          </div>
        );
      })}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl p-4 shadow-card space-y-4">
        <h3 className="font-semibold text-foreground text-sm">🔮 Simule cenários financeiros</h3>
        <div className="space-y-2">
          {simulations.map((s, i) => (
            <button key={i} type="button" onClick={() => setSelectedSim(selectedSim === i ? null : i)}
              className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${selectedSim === i ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
              <p className="text-foreground font-medium">{s.question}</p>
              {selectedSim === i && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">{s.result}</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={simChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(234 20% 20%)" />
                        <XAxis dataKey="month" stroke="hsl(237 17% 67%)" fontSize={10} />
                        <YAxis stroke="hsl(237 17% 67%)" fontSize={10} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ background: 'hsl(234 33% 14%)', border: '1px solid hsl(234 20% 20%)', borderRadius: 8, color: '#F8F8F8', fontSize: 12 }} />
                        <Line type="monotone" dataKey="value" stroke="hsl(164 100% 42%)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">Crie sua simulação</p>
          <div className="flex gap-2">
            <Input value={customSim} onChange={e => setCustomSim(e.target.value)} placeholder="E se eu..."
              className="bg-muted border-border flex-1" />
            <Button onClick={() => setShowCustomResult(true)} disabled={!customSim} size="sm"
              className="bg-secondary text-secondary-foreground text-xs">Analisar</Button>
          </div>
          {showCustomResult && customSim && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-3 bg-muted rounded-lg text-sm text-foreground">
              Com base nos seus dados, essa mudança poderia gerar uma economia de R$350/mês, melhorando seu score financeiro em +5 pontos em 3 meses.
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
