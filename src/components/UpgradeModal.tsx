import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const PLANS: { name: string; priceMain: string; priceSub: string | null; badge: string | null; features: string[]; cta: string; href: string; className: string }[] = [
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
    className: 'bg-primary text-primary-foreground',
  },
  {
    name: 'Pro Semestral',
    priceMain: '6x R$ 32,83',
    priceSub: 'ou R$ 197 à vista',
    badge: 'Economize R$ 85',
    features: ['Todos os benefícios do Pro Mensal'],
    cta: 'Assinar por R$197',
    href: 'https://pay.kiwify.com.br/uzUMxK5',
    className: 'bg-purple-600 text-white',
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
    className: 'bg-gradient-to-r from-primary to-purple-600 text-white',
  },
];

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  title = 'Esta é uma funcionalidade Pro 🚀',
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X size={18} className="text-foreground" />
          </button>
        </DialogHeader>
        <div className="grid gap-4 mt-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="border border-border rounded-xl p-4 bg-muted/30"
            >
              {plan.badge && (
                <span className="text-xs font-semibold text-primary mb-2 block">
                  {plan.badge}
                </span>
              )}
              <p className="font-semibold text-foreground">{plan.name}</p>
              <p className="text-xl font-bold text-foreground">{plan.priceMain}</p>
              {plan.priceSub && (
                <p className="text-xs text-muted-foreground">{plan.priceSub}</p>
              )}
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                {plan.features.slice(0, 3).map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
              <Button
                className={`mt-3 w-full ${plan.className}`}
                onClick={() => window.open(plan.href, '_blank')}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
