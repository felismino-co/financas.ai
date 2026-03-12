import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage, getFriendlyError } from '@/lib/supabase-error';
import type { Bill } from '@/types/database';

export interface BillApp {
  id: string;
  description: string;
  amount: number;
  due_day: number;
  type: 'income' | 'expense';
  category: string | null;
  is_recurring: boolean;
}

function toApp(b: Bill): BillApp {
  return {
    id: b.id,
    description: b.description,
    amount: Number(b.amount),
    due_day: b.due_day,
    type: b.type as 'income' | 'expense',
    category: b.category,
    is_recurring: b.is_recurring,
  };
}

export function useBills(userId: string | undefined, familyId: string | null | undefined) {
  const [bills, setBills] = useState<BillApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setBills([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from('bills').select('*').order('due_day', { ascending: true });
      if (familyId) {
        q = q.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
      } else {
        q = q.eq('user_id', userId);
      }
      const { data, error: e } = await q;
      if (e) throw e;
      setBills((data || []).map(toApp));
    } catch (err) {
      const msg = getErrorMessage(err, 'Erro ao carregar contas');
      setError(getFriendlyError(msg, 'Erro ao conectar. Verifique se a tabela bills existe no banco.'));
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [userId, familyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addBill = async (data: Omit<BillApp, 'id'>) => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    const { error: e } = await supabase.from('bills').insert({
      user_id: userId,
      family_id: familyId ?? null,
      description: data.description,
      amount: data.amount,
      due_day: data.due_day,
      type: data.type,
      category: data.category ?? null,
      is_recurring: data.is_recurring ?? true,
    });
    if (e) throw e;
    await fetch();
  };

  const updateBill = async (id: string, data: Partial<BillApp>) => {
    setError(null);
    const payload: Record<string, unknown> = {};
    if (data.description !== undefined) payload.description = data.description;
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.due_day !== undefined) payload.due_day = data.due_day;
    if (data.type !== undefined) payload.type = data.type;
    if (data.category !== undefined) payload.category = data.category;
    if (data.is_recurring !== undefined) payload.is_recurring = data.is_recurring;
    const { error: e } = await supabase.from('bills').update(payload).eq('id', id);
    if (e) throw e;
    await fetch();
  };

  const deleteBill = async (id: string) => {
    setError(null);
    const { error: e } = await supabase.from('bills').delete().eq('id', id);
    if (e) throw e;
    await fetch();
  };

  const upcomingDue = useCallback((daysAhead = 7, type?: 'income' | 'expense') => {
    const today = new Date().getDate();
    const maxDay = today + daysAhead;
    return bills.filter((b) => {
      if (type && b.type !== type) return false;
      const d = b.due_day;
      if (d >= today && d <= Math.min(maxDay, 31)) return true;
      if (maxDay > 31 && d <= (maxDay - 31)) return true;
      return false;
    });
  }, [bills]);

  return {
    bills,
    loading,
    error,
    refetch: fetch,
    addBill,
    updateBill,
    deleteBill,
    upcomingDue,
  };
}
