import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage, getFriendlyError } from '@/lib/supabase-error';
import type { Bill, BillType, BillNote } from '@/types/database';

export interface BillApp {
  id: string;
  description: string;
  amount: number;
  due_day: number;
  type: 'income' | 'expense';
  category: string | null;
  is_recurring: boolean;
  is_variable?: boolean;
  paid_at?: string | null;
  installments?: number;
  paid_installments?: number;
  bill_type?: BillType;
  installment_current?: number;
  installment_total?: number;
  notes_history?: BillNote[];
  tags?: string[];
  card_limit?: number | null;
  card_closing_day?: number | null;
  creditor_name?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  status?: string;
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
    is_variable: b.is_variable,
    paid_at: b.paid_at,
    installments: b.installments ?? 1,
    paid_installments: b.paid_installments ?? 0,
    bill_type: b.bill_type as BillType | undefined,
    installment_current: b.installment_current ?? 1,
    installment_total: b.installment_total ?? 1,
    notes_history: (b.notes_history as BillNote[]) ?? [],
    tags: b.tags ?? [],
    card_limit: b.card_limit,
    card_closing_day: b.card_closing_day,
    creditor_name: b.creditor_name,
    total_amount: b.total_amount != null ? Number(b.total_amount) : null,
    paid_amount: b.paid_amount != null ? Number(b.paid_amount) : null,
    status: b.status,
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

  const addBill = async (data: Partial<BillApp> & Pick<BillApp, 'description' | 'amount' | 'due_day' | 'type'>) => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    const payload: Record<string, unknown> = {
      user_id: userId,
      family_id: familyId ?? null,
      description: data.description,
      amount: data.amount,
      due_day: data.due_day,
      type: data.type,
      category: data.category ?? null,
      is_recurring: data.is_recurring ?? true,
      bill_type: data.bill_type ?? 'fixed',
      installment_current: data.installment_current ?? 1,
      installment_total: data.installment_total ?? 1,
      is_variable: data.bill_type === 'variable' || data.is_variable,
    };
    if (data.card_limit != null) payload.card_limit = data.card_limit;
    if (data.card_closing_day != null) payload.card_closing_day = data.card_closing_day;
    if (data.creditor_name != null) payload.creditor_name = data.creditor_name;
    if (data.total_amount != null) payload.total_amount = data.total_amount;
    if (data.paid_amount != null) payload.paid_amount = data.paid_amount;
    if (data.tags?.length) payload.tags = data.tags;
    const { error: e } = await supabase.from('bills').insert(payload);
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
    if (data.is_variable !== undefined) payload.is_variable = data.is_variable;
    if (data.paid_at !== undefined) payload.paid_at = data.paid_at;
    if (data.installments !== undefined) payload.installments = data.installments;
    if (data.paid_installments !== undefined) payload.paid_installments = data.paid_installments;
    if (data.bill_type !== undefined) payload.bill_type = data.bill_type;
    if (data.installment_current !== undefined) payload.installment_current = data.installment_current;
    if (data.installment_total !== undefined) payload.installment_total = data.installment_total;
    if (data.notes_history !== undefined) payload.notes_history = data.notes_history;
    if (data.tags !== undefined) payload.tags = data.tags;
    if (data.card_limit !== undefined) payload.card_limit = data.card_limit;
    if (data.card_closing_day !== undefined) payload.card_closing_day = data.card_closing_day;
    if (data.creditor_name !== undefined) payload.creditor_name = data.creditor_name;
    if (data.total_amount !== undefined) payload.total_amount = data.total_amount;
    if (data.paid_amount !== undefined) payload.paid_amount = data.paid_amount;
    if (data.status !== undefined) payload.status = data.status;
    const { error: e } = await supabase.from('bills').update(payload).eq('id', id);
    if (e) throw e;
    await fetch();
  };

  const markAsPaid = async (id: string) => {
    setError(null);
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;
    const total = bill.installment_total ?? bill.installments ?? 1;
    const current = bill.installment_current ?? bill.paid_installments ?? 0;
    const nextCurrent = current + 1;
    const isLast = nextCurrent >= total;
    const payload: Record<string, unknown> =
      total > 1 && !isLast
        ? { installment_current: nextCurrent, paid_installments: nextCurrent }
        : { paid_at: new Date().toISOString(), paid_installments: total, installment_current: total, status: 'paid' };
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
    markAsPaid,
    upcomingDue,
  };
}
