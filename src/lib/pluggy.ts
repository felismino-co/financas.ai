import { supabase } from '@/lib/supabase';

const getFunctionsUrl = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return '';
  return `${url.replace(/\/$/, '')}/functions/v1`;
};

export async function getConnectToken(userId: string): Promise<string> {
  const base = getFunctionsUrl();
  if (!base) throw new Error('Supabase URL não configurada');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Não autenticado');

  const res = await fetch(`${base}/pluggy-connect-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao obter token Pluggy');
  }
  const { accessToken } = await res.json();
  return accessToken;
}

export async function syncItem(itemId: string, userId: string): Promise<{ success: boolean; transactionsImported: number }> {
  const base = getFunctionsUrl();
  if (!base) throw new Error('Supabase URL não configurada');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Não autenticado');

  const res = await fetch(`${base}/pluggy-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ itemId, userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao sincronizar');
  }
  return res.json();
}

export type PluggyTransaction = {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  date: string;
  category?: string | null;
};

const PLUGGY_CATEGORY_MAP: Record<string, string> = {
  alimentação: 'Alimentação',
  alimentacao: 'Alimentação',
  food: 'Alimentação',
  moradia: 'Moradia',
  housing: 'Moradia',
  transporte: 'Transporte',
  transport: 'Transporte',
  saúde: 'Saúde',
  saude: 'Saúde',
  health: 'Saúde',
  educação: 'Educação',
  educacao: 'Educação',
  education: 'Educação',
  lazer: 'Lazer',
  entertainment: 'Lazer',
  assinaturas: 'Assinaturas',
  subscriptions: 'Assinaturas',
  roupas: 'Roupas',
  clothing: 'Roupas',
  salário: 'Salário',
  salario: 'Salário',
  salary: 'Salário',
  freelance: 'Freelance',
  investimentos: 'Investimentos',
  investments: 'Investimentos',
  presente: 'Presente',
  gift: 'Presente',
};

export function mapPluggyTransaction(tx: PluggyTransaction): {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category: string;
  pluggy_transaction_id: string;
} {
  const type = tx.type === 'DEBIT' ? 'expense' : 'income';
  const amount = Math.abs(Number(tx.amount));
  const date = typeof tx.date === 'string' ? tx.date.split('T')[0] : new Date(tx.date).toISOString().split('T')[0];
  let category = 'Outros';
  if (tx.category) {
    const lower = tx.category.toLowerCase();
    for (const [key, val] of Object.entries(PLUGGY_CATEGORY_MAP)) {
      if (lower.includes(key)) {
        category = val;
        break;
      }
    }
  }
  return {
    type,
    amount,
    description: tx.description || 'Transação importada',
    date,
    category,
    pluggy_transaction_id: tx.id,
  };
}
