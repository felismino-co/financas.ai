import { useMemo } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { TransactionApp } from './useTransactions';
import type { Profile } from '@/types/database';

export interface UseDashboardReturn {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  recentTransactions: TransactionApp[];
  score: number;
  loading: boolean;
  error: string | null;
}

/**
 * Calcula saldo, totais e últimas transações do mês atual.
 * Score vem do perfil (financial_score).
 */
export function useDashboard(
  transactions: TransactionApp[],
  profile: Profile | null,
  loadingTransactions: boolean,
  loadingProfile: boolean
): UseDashboardReturn {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString().split('T')[0];
  const monthEnd = endOfMonth(now).toISOString().split('T')[0];

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => t.date >= monthStart && t.date <= monthEnd
      ),
    [transactions, monthStart, monthEnd]
  );

  const totalIncome = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0),
    [monthTransactions]
  );

  const totalExpense = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0),
    [monthTransactions]
  );

  const balance = totalIncome - totalExpense;

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [transactions]
  );

  const score = profile?.financial_score ?? 0;

  return {
    balance,
    totalIncome,
    totalExpense,
    recentTransactions,
    score,
    loading: loadingTransactions || loadingProfile,
    error: null,
  };
}

/**
 * Hook auxiliar: carrega perfil do usuário pelo id (auth).
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}
