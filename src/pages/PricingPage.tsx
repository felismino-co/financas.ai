import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const PLANS = [
  {
    name: 'Grátis',
    priceMain: 'R$ 0',
    priceSub: null,
    badge: null,
    features: [
      '30 créditos de IA por mês',
      'Até 50 lançamentos/mês',
      '1 meta financeira',
      'Dashboard básico',
      'Sem modo família',
    ],
    cta: 'Começar grátis',
    href: '/login',
    current: false,
    highlight: false,
  },
  {
    name: 'Pro Mensal',
    priceMain: 'R$ 47/mês',
    priceSub: null,
    badge: null,
    features: [
      'Créditos de IA ilimitados',
      'Lançamentos ilimitados',
      'Metas ilimitadas',
      'Modo família/casal',
      'Insights semanais automáticos',
      'Plano mensal personalizado com IA',
      'Transcrição de áudio ilimitada',
      'Suporte prioritário',
    ],
    cta: 'Assinar por R$47/mês',
    href: 'https://pay.kiwify.com.br/VUJcmP0',
    current: false,
    highlight: false,
  },
  {
    name: 'Pro Semestral',
    priceMain: '6x R$ 32,83',
    priceSub: 'ou R$ 197 à vista',
    badge: 'Economize R$ 85',
    features: ['Todos os benefícios do Pro Mensal'],
    cta: 'Assinar por R$197',
    href: 'https://pay.kiwify.com.br/uzUMxK5',
    current: false,
    highlight: false,
  },
  {
    name: 'Pro Anual',
    priceMain: '12x R$ 24,75',
    priceSub: 'ou R$ 297 à vista',
    badge: 'Economize R$ 267 🔥 Mais popular',
    features: [
      'Todos os benefícios do Pro Mensal',
      'Acesso antecipado a novas funcionalidades',
    ],
    cta: 'Assinar por R$297/ano',
    href: 'https://pay.kiwify.com.br/y8zncPg',
    current: false,
    highlight: true,
  },
];

const FAQ = [
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Você pode cancelar a qualquer momento. Não há fidelidade.',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'Via Kiwify, com cartão de crédito ou PIX. Processamento seguro.',
  },
  {
    q: 'Tem período de teste?',
    a: 'Sim. 7 dias grátis no plano Pro para você testar.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b border-border">
        <Link to="/" className="flex justify-center">
          <Logo size="sm" />
        </Link>
      </header>
      <main className="max-w-4xl mx-auto p-6 space-y-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Planos e preços</h1>
          <p className="text-muted-foreground mt-2">
            Comece grátis, faça upgrade quando quiser.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-5 ${
                plan.highlight
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              {(plan as { badge?: string }).badge && (
                <span className="text-xs font-semibold text-primary mb-2 block">
                  {(plan as { badge: string }).badge}
                </span>
              )}
              <h3 className="font-semibold text-foreground">{plan.name}</h3>
              <p className="text-2xl font-bold text-foreground mt-1">
                {(plan as { priceMain: string }).priceMain}
              </p>
              {(plan as { priceSub?: string }).priceSub && (
                <p className="text-sm text-muted-foreground mt-1">
                  {(plan as { priceSub: string }).priceSub}
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={14} className="text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full mt-5 ${
                  plan.current
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : plan.highlight
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                }`}
                disabled={plan.current}
                onClick={() => {
                  if (plan.current) return;
                  if (plan.href.startsWith('http')) window.open(plan.href, '_blank');
                  else window.location.href = plan.href;
                }}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Perguntas frequentes</h2>
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4"
            >
              <p className="font-medium text-foreground">{item.q}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.a}</p>
            </div>
          ))}
        </section>

        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Comece grátis, faça upgrade quando quiser.
          </p>
          <Link to="/login">
            <Button className="bg-primary text-primary-foreground">
              Começar grátis
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
