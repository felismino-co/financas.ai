import { useState } from 'react';
import { useAICredits } from '@/hooks/useAICredits';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AICreditsBar() {
  const { used, limit, remaining, isUnlimited } = useAICredits();
  const [showModal, setShowModal] = useState(false);

  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const barColor =
    pct >= 80 ? 'bg-destructive' : pct >= 50 ? 'bg-warning' : 'bg-success';

  const handleClick = () => {
    if (remaining <= 0 && !isUnlimited) setShowModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isUnlimited ? (
          <span>Créditos IA: Ilimitados</span>
        ) : (
          <>
            <span className="font-medium text-foreground">
              {used}/{limit}
            </span>
            <span>créditos usados este mês</span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </>
        )}
      </button>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Seus créditos acabaram!
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Faça upgrade para o plano Pro para créditos ilimitados de IA e
            aproveitar todos os recursos.
          </p>
          <Button
            onClick={() => {
              setShowModal(false);
              window.location.href = '/profile';
            }}
            className="w-full bg-primary text-primary-foreground"
          >
            Ver planos Pro
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
