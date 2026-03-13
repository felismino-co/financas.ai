export const RECEIVABLE_TYPES = [
  { value: 'recurring', label: 'Recorrente Fixo', icon: '🔁', description: 'Aluguel, mensalidade' },
  { value: 'installment', label: 'Parcelado', icon: '📦', description: 'Vendeu em X vezes' },
  { value: 'client', label: 'Cliente Ativo', icon: '👤', description: 'Presta serviço até X data' },
  { value: 'salary', label: 'Salário Fixo', icon: '💼', description: 'Empresa/fonte, dia do mês' },
  { value: 'passive', label: 'Renda Passiva', icon: '💰', description: 'Dividendos, royalties' },
  { value: 'debt', label: 'Me Devem', icon: '🤝', description: 'Dívida de pessoa' },
  { value: 'custom', label: 'Personalizado', icon: '➕', description: 'Configurar como quiser' },
] as const;

export const RECEIVABLE_TAGS = [
  { value: 'confirmed', label: '✅ Confirmado' },
  { value: 'awaiting', label: '⏳ Aguardando' },
  { value: 'overdue', label: '⚠️ Atrasado' },
  { value: 'negotiating', label: '🔄 Negociando' },
  { value: 'contacted', label: '📞 Contato feito' },
];
