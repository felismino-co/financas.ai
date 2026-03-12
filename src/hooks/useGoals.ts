import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Goal as DbGoal } from '@/types/database';

export interface GoalApp {
  id: string;
  name: string;
  emoji: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  user_id?: string;
  family_id?: string | null;
}

function toApp(g: DbGoal): GoalApp {
  return {
    id: g.id,
    name: g.name,
    emoji: g.emoji,
    color: g.color,
    targetAmount: Number(g.target_amount),
    currentAmount: Number(g.current_amount),
    deadline: g.deadline,
    user_id: g.user_id,
    family_id: g.family_id,
  };
}

export interface UseGoalsReturn {
  goals: GoalApp[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addGoal: (data: Omit<GoalApp, 'id'> & { family_id?: string | null }) => Promise<void>;
  updateGoal: (id: string, data: Partial<GoalApp>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateProgress: (id: string, newCurrentAmount: number) => Promise<void>;
}

export function useGoals(
  userId: string | undefined,
  familyId: string | null | undefined
): UseGoalsReturn {
  const [goals, setGoals] = useState<GoalApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('goals')
        .select('*')
        .or(familyId ? `user_id.eq.${userId},family_id.eq.${familyId}` : `user_id.eq.${userId}`)
        .order('deadline', { ascending: true });
      if (e) throw e;
      setGoals((data || []).map(toApp));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar metas.');
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [userId, familyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addGoal = async (data: Omit<GoalApp, 'id'> & { family_id?: string | null }) => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    const { error: e } = await supabase.from('goals').insert({
      user_id: userId,
      family_id: data.family_id ?? null,
      name: data.name,
      target_amount: data.targetAmount,
      current_amount: data.currentAmount ?? 0,
      deadline: data.deadline,
      color: data.color ?? '#00D4AA',
      emoji: data.emoji ?? '🎯',
    });
    if (e) throw e;
    await fetch();
  };

  const updateGoal = async (id: string, data: Partial<GoalApp>) => {
    setError(null);
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.targetAmount !== undefined) payload.target_amount = data.targetAmount;
    if (data.currentAmount !== undefined) payload.current_amount = data.currentAmount;
    if (data.deadline !== undefined) payload.deadline = data.deadline;
    if (data.color !== undefined) payload.color = data.color;
    if (data.emoji !== undefined) payload.emoji = data.emoji;
    const { error: e } = await supabase.from('goals').update(payload).eq('id', id);
    if (e) throw e;
    await fetch();
  };

  const deleteGoal = async (id: string) => {
    setError(null);
    const { error: e } = await supabase.from('goals').delete().eq('id', id);
    if (e) throw e;
    await fetch();
  };

  const updateProgress = async (id: string, newCurrentAmount: number) => {
    await updateGoal(id, { currentAmount: newCurrentAmount });
  };

  return {
    goals,
    loading,
    error,
    refetch: fetch,
    addGoal,
    updateGoal,
    deleteGoal,
    updateProgress,
  };
}
