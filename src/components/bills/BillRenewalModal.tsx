import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BillRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billName: string;
  nextMonth: string;
  onRenew: () => void | Promise<void>;
  onEnd: () => void | Promise<void>;
  loading?: boolean;
}

export function BillRenewalModal({
  open,
  onOpenChange,
  billName,
  nextMonth,
  onRenew,
  onEnd,
  loading = false,
}: BillRenewalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>✅ {billName} pago!</DialogTitle>
          <DialogDescription id="renew-desc">
            Renovar para {nextMonth}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onEnd();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Não, encerrar
          </Button>
          <Button
            onClick={async () => {
              await onRenew();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Sim, renovar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
