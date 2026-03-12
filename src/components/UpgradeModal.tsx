import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const PLANS = [
  {
    name: 'Pro Mensal',
    price: 'R$ 47',
    period: '/mês',
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
    href: '#kiwify-mensal',
    className: 'bg-primary text-primary-foreground',
  },
  {
    name: 'Pro Semestral',
    price: 'R$ 197',
    period: '/ 6 meses',
    badge: 'Economize R$85',
    features: [
      'Equivale a R$ 32,83/mês',
      'Todos os benefícios do Pro Mensal',
    ],
    cta: 'Assinar por R$197',
    href: '#kiwify-semestral',
    className: 'bg-purple-600 text-white',
  },
  {
    name: 'Pro Anual',
    price: 'R$ 297',
    period: '/ano',
    badge: '🔥 Mais popular — Economize R$267',
    features: [
      '12x de R$ 24,75',
      'Todos os benefícios do Pro Mensal',
      'Acesso antecipado a novas funcionalidades',
    ],
    cta: 'Assinar por R$297/ano',
    href: '#kiwify-anual',
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
              <p className="font-semibold text-foreground">
                {plan.name} — {plan.price}
                <span className="text-muted-foreground font-normal">
                  {plan.period}
                </span>
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                {plan.features.slice(0, 3).map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
              <Button
                className={`mt-3 w-full ${plan.className}`}
                onClick={() => {
                  window.location.href = plan.href;
                }}
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
