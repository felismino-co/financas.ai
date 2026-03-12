import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Budget as DbBudget } from '@/types/database';

export interface BudgetApp {
  id: string;
  category: string;
  limit: number;
  spent: number;
  month: number;
  year: number;
  user_id?: string;
  family_id?: string | null;
}

export interface UseBudgetsReturn {
  budgets: BudgetApp[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setLimit: (category: string, limitAmount: number) => Promise<void>;
  getPercentUsed: (category: string) => number;
}

export function useBudgets(
  userId: string | undefined,
  familyId: string | null | undefined,
  month: number,
  year: number,
  spentByCategory: Record<string, number>
): UseBudgetsReturn {
  const [budgets, setBudgets] = useState<BudgetApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setBudgets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('budgets')
        .select('*')
        .eq('month', month)
        .eq('year', year);
      if (familyId) {
        q = q.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
      } else {
        q = q.eq('user_id', userId);
      }
      const { data, error: e } = await q;
      if (e) throw e;
      const rows = (data || []) as DbBudget[];
      setBudgets(
        rows.map((b) => ({
          id: b.id,
          category: b.category,
          limit: Number(b.limit_amount),
          spent: spentByCategory[b.category] ?? 0,
          month: b.month,
          year: b.year,
          user_id: b.user_id,
          family_id: b.family_id,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar orçamentos.');
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [userId, familyId, month, year, JSON.stringify(spentByCategory)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const setLimit = async (category: string, limitAmount: number) => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    const { data: existing } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('family_id', familyId ?? null)
      .eq('category', category)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (existing?.id) {
      const { error: e } = await supabase
        .from('budgets')
        .update({ limit_amount: limitAmount })
        .eq('id', existing.id);
      if (e) throw e;
    } else {
      const { error: e } = await supabase.from('budgets').insert({
        user_id: userId,
        family_id: familyId ?? null,
        category,
        limit_amount: limitAmount,
        month,
        year,
      });
      if (e) throw e;
    }
    await fetch();
  };

  const getPercentUsed = (category: string) => {
    const b = budgets.find((x) => x.category === category);
    if (!b || b.limit <= 0) return 0;
    return Math.round((b.spent / b.limit) * 100);
  };

  return {
    budgets,
    loading,
    error,
    refetch: fetch,
    setLimit,
    getPercentUsed,
  };
}
