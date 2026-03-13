import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage, getFriendlyError } from '@/lib/supabase-error';
import { useViewMode } from '@/contexts/ViewModeContext';

export interface ReceivableNote {
  text: string;
  tags: string[];
  created_at: string;
}

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
  receivable_type?: string;
  installment_current?: number;
  installment_total?: number;
  notes_history?: ReceivableNote[];
  tags?: string[];
  debtor_name?: string | null;
  client_name?: string | null;
  contract_end_date?: string | null;
  service_description?: string | null;
  total_amount?: number | null;
  received_amount?: number | null;
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

  const addReceivable = async (data: Partial<Receivable> & Pick<Receivable, 'description' | 'amount'>) => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    const payload: Record<string, unknown> = {
      user_id: userId,
      family_id: familyId ?? null,
      description: data.description,
      amount: data.amount,
      due_date: data.due_date || null,
      frequency: data.frequency || 'once',
      installments: data.installments || data.installment_total || 1,
      installment_value: data.installment_value ?? null,
      category: data.category ?? null,
      notes: data.notes ?? null,
      status: data.status || 'pending',
      receivable_type: data.receivable_type ?? 'recurring',
      installment_current: data.installment_current ?? 1,
      installment_total: data.installment_total ?? data.installments ?? 1,
    };
    if (data.debtor_name != null) payload.debtor_name = data.debtor_name;
    if (data.client_name != null) payload.client_name = data.client_name;
    if (data.contract_end_date != null) payload.contract_end_date = data.contract_end_date;
    if (data.service_description != null) payload.service_description = data.service_description;
    if (data.total_amount != null) payload.total_amount = data.total_amount;
    if (data.received_amount != null) payload.received_amount = data.received_amount;
    if (data.tags?.length) payload.tags = data.tags;
    const { error: e } = await supabase.from('receivables').insert(payload);
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
    if (data.receivable_type !== undefined) payload.receivable_type = data.receivable_type;
    if (data.installment_current !== undefined) payload.installment_current = data.installment_current;
    if (data.installment_total !== undefined) payload.installment_total = data.installment_total;
    if (data.notes_history !== undefined) payload.notes_history = data.notes_history;
    if (data.tags !== undefined) payload.tags = data.tags;
    if (data.debtor_name !== undefined) payload.debtor_name = data.debtor_name;
    if (data.client_name !== undefined) payload.client_name = data.client_name;
    if (data.contract_end_date !== undefined) payload.contract_end_date = data.contract_end_date;
    if (data.service_description !== undefined) payload.service_description = data.service_description;
    if (data.total_amount !== undefined) payload.total_amount = data.total_amount;
    if (data.received_amount !== undefined) payload.received_amount = data.received_amount;
    const { error: e } = await supabase.from('receivables').update(payload).eq('id', id);
    if (e) throw e;
    await fetch();
  };

  const markAsReceived = async (id: string) => {
    const recv = receivables.find((r) => r.id === id);
    if (!recv) return;
    const total = recv.installment_total ?? recv.installments ?? 1;
    const current = recv.installment_current ?? 0;
    const nextCurrent = current + 1;
    const isLast = nextCurrent >= total;
    if (total > 1 && !isLast) {
      await updateReceivable(id, {
        installment_current: nextCurrent,
        received_amount: (recv.received_amount ?? 0) + recv.amount,
      });
    } else {
      await updateReceivable(id, {
        status: 'received',
        received_at: new Date().toISOString(),
        installment_current: total,
        received_amount: recv.total_amount ?? recv.amount,
      });
    }
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
    receivable_type: r.receivable_type as string | undefined,
    installment_current: r.installment_current != null ? Number(r.installment_current) : 1,
    installment_total: r.installment_total != null ? Number(r.installment_total) : 1,
    notes_history: (r.notes_history as ReceivableNote[]) ?? [],
    tags: (r.tags as string[]) ?? [],
    debtor_name: r.debtor_name as string | null,
    client_name: r.client_name as string | null,
    contract_end_date: r.contract_end_date as string | null,
    service_description: r.service_description as string | null,
    total_amount: r.total_amount != null ? Number(r.total_amount) : null,
    received_amount: r.received_amount != null ? Number(r.received_amount) : null,
  };
}
