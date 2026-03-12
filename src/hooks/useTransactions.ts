import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Transaction as DbTransaction } from '@/types/database';

/** Formato usado pela UI (camelCase, note) */
export interface TransactionApp {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string;
  recurring?: boolean;
  frequency?: 'weekly' | 'monthly';
  note?: string;
  user_id?: string;
  family_id?: string | null;
  source?: 'manual' | 'pluggy';
  pluggy_transaction_id?: string | null;
}

function toApp(t: DbTransaction): TransactionApp {
  return {
    id: t.id,
    type: t.type as 'income' | 'expense',
    description: t.description,
    amount: Number(t.amount),
    date: t.date,
    category: t.category,
    recurring: t.recurring,
    frequency: t.frequency as 'weekly' | 'monthly' | undefined,
    note: t.notes ?? undefined,
    user_id: t.user_id,
    family_id: t.family_id,
    source: (t as { source?: 'manual' | 'pluggy' }).source,
    pluggy_transaction_id: (t as { pluggy_transaction_id?: string | null }).pluggy_transaction_id,
  };
}

export interface UseTransactionsFilters {
  month?: number;
  year?: number;
  category?: string;
  type?: 'income' | 'expense' | 'all';
  source?: 'all' | 'manual' | 'pluggy';
}

export interface UseTransactionsReturn {
  transactions: TransactionApp[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addTransaction: (data: Omit<TransactionApp, 'id'> & { family_id?: string | null }) => Promise<void>;
  updateTransaction: (id: string, data: Partial<TransactionApp>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export function useTransactions(
  userId: string | undefined,
  familyId: string | null | undefined,
  filters: UseTransactionsFilters = {}
): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<TransactionApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (familyId) {
        q = q.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
      } else {
        q = q.eq('user_id', userId);
      }

      if (filters.month != null && filters.year != null) {
        const start = new Date(filters.year, filters.month - 1, 1).toISOString().split('T')[0];
        const end = new Date(filters.year, filters.month, 0).toISOString().split('T')[0];
        q = q.gte('date', start).lte('date', end);
      }
      if (filters.category && filters.category !== 'all') {
        q = q.eq('category', filters.category);
      }
      if (filters.type && filters.type !== 'all') {
        q = q.eq('type', filters.type);
      }
      if (filters.source && filters.source !== 'all') {
        q = q.eq('source', filters.source);
      }

      const { data, error: e } = await q;
      if (e) throw e;
      setTransactions((data || []).map(toApp));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar transações.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, familyId, filters.month, filters.year, filters.category, filters.type, filters.source]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addTransaction = async (
    data: Omit<TransactionApp, 'id'> & { family_id?: string | null }
  ) => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    const { error: e } = await supabase.from('transactions').insert({
      user_id: userId,
      family_id: data.family_id ?? null,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category,
      date: data.date,
      recurring: data.recurring ?? false,
      frequency: data.frequency ?? null,
      notes: data.note ?? null,
      source: 'manual',
    });
    if (e) throw e;
    await fetch();
  };

  const updateTransaction = async (id: string, data: Partial<TransactionApp>) => {
    setError(null);
    const payload: Record<string, unknown> = {};
    if (data.description !== undefined) payload.description = data.description;
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.type !== undefined) payload.type = data.type;
    if (data.category !== undefined) payload.category = data.category;
    if (data.date !== undefined) payload.date = data.date;
    if (data.recurring !== undefined) payload.recurring = data.recurring;
    if (data.frequency !== undefined) payload.frequency = data.frequency;
    if (data.note !== undefined) payload.notes = data.note;
    const { error: e } = await supabase.from('transactions').update(payload).eq('id', id);
    if (e) throw e;
    await fetch();
  };

  const deleteTransaction = async (id: string) => {
    setError(null);
    const { error: e } = await supabase.from('transactions').delete().eq('id', id);
    if (e) throw e;
    await fetch();
  };

  return {
    transactions,
    loading,
    error,
    refetch: fetch,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
