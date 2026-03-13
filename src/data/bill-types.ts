import type { BillType } from '@/types/database';

export const BILL_TYPES: { value: BillType; label: string; icon: string; description: string }[] = [
  { value: 'fixed', label: 'Fixa Mensal', icon: '🔁', description: 'Aluguel, internet, água' },
  { value: 'installment', label: 'Parcelada', icon: '📦', description: 'X de Y parcelas' },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: '💳', description: 'Fatura mensal' },
  { value: 'variable', label: 'Variável', icon: '📊', description: 'Mercado, combustível' },
  { value: 'informal', label: 'Dívida Informal', icon: '🤝', description: 'Devo para pessoa' },
];

export const BILL_TAGS = [
  { value: 'urgent', label: '🔴 Urgente' },
  { value: 'negotiating', label: '🟡 Negociando' },
  { value: 'overdue', label: '⚫ Atrasado' },
  { value: 'on_track', label: '🟢 Em dia' },
  { value: 'awaiting', label: '📞 Aguardando contato' },
];
