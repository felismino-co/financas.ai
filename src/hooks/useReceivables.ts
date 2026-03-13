import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage, getFriendlyError } from '@/lib/supabase-error';
import { useViewMode } from '@/contexts/ViewModeContext';

export interface Receivable {
  id: string;
  user_id: string;
  family_id: string | null;
  description: string;
  amount: number;
  due_date: string | null;
  frequency: 'once' | 'monthly' | 'recurring';
  installments: number;
  installment_value: number | null;
  category: string | null;
  notes: string | null;
  status: 'pending' | 'received' | 'overdue';
  received_at: string | null;
  created_at: string;
}

export function useReceivables() {
  const { userId, familyId } = useViewMode();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setReceivables([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('receivables')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true, nullsFirst: false });
      const { data, error: e } = await q;
      if (e) throw e;
      setReceivables((data || []).map(toReceivable));
    } catch (err) {
      const msg = getErrorMessage(err, 'Erro ao carregar recebíveis');
      setError(getFriendlyError(msg, 'Erro ao conectar. Execute a migration receivables no Supabase.'));
      setReceivables([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addReceivable = async (data: Omit<Receivable, 'id' | 'user_id' | 'family_id' | 'created_at'>) => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    const { error: e } = await supabase.from('receivables').insert({
      user_id: userId,
      family_id: familyId ?? null,
      description: data.description,
      amount: data.amount,
      due_date: data.due_date || null,
      frequency: data.frequency || 'once',
      installments: data.installments || 1,
      installment_value: data.installment_value ?? null,
      category: data.category ?? null,
      notes: data.notes ?? null,
      status: data.status || 'pending',
    });
    if (e) throw e;
    await fetch();
  };

  const updateReceivable = async (id: string, data: Partial<Receivable>) => {
    setError(null);
    const payload: Record<string, unknown> = {};
    if (data.description !== undefined) payload.description = data.description;
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.due_date !== undefined) payload.due_date = data.due_date;
    if (data.frequency !== undefined) payload.frequency = data.frequency;
    if (data.installments !== undefined) payload.installments = data.installments;
    if (data.installment_value !== undefined) payload.installment_value = data.installment_value;
    if (data.category !== undefined) payload.category = data.category;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.status !== undefined) payload.status = data.status;
    if (data.received_at !== undefined) payload.received_at = data.received_at;
    const { error: e } = await supabase.from('receivables').update(payload).eq('id', id);
    if (e) throw e;
    await fetch();
  };

  const markAsReceived = async (id: string) => {
    await updateReceivable(id, { status: 'received', received_at: new Date().toISOString() });
  };

  const deleteReceivable = async (id: string) => {
    setError(null);
    const { error: e } = await supabase.from('receivables').delete().eq('id', id);
    if (e) throw e;
    await fetch();
  };

  return {
    receivables,
    loading,
    error,
    refetch: fetch,
    addReceivable,
    updateReceivable,
    markAsReceived,
    deleteReceivable,
  };
}

function toReceivable(r: Record<string, unknown>): Receivable {
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    family_id: r.family_id as string | null,
    description: r.description as string,
    amount: Number(r.amount),
    due_date: r.due_date as string | null,
    frequency: (r.frequency as 'once' | 'monthly' | 'recurring') || 'once',
    installments: Number(r.installments) || 1,
    installment_value: r.installment_value != null ? Number(r.installment_value) : null,
    category: r.category as string | null,
    notes: r.notes as string | null,
    status: (r.status as 'pending' | 'received' | 'overdue') || 'pending',
    received_at: r.received_at as string | null,
    created_at: r.created_at as string,
  };
}
