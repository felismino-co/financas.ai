import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { syncItem } from '@/lib/pluggy';
import type { BankConnection } from '@/types/database';
import { usePlan } from './usePlan';

const FREE_BANK_LIMIT = 0;
const PRO_BANK_LIMIT = 3;
const EXTRA_BANK_PRICE = 9.9;

export function useBankConnections(userId: string | undefined) {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { isPro } = usePlan();

  const fetchConnections = useCallback(async () => {
    if (!userId) {
      setConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) setConnections(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const canAddBank = useCallback(() => {
    const limit = getBankLimit();
    return connections.length < limit;
  }, [connections.length, isPro]);

  const getBankLimit = useCallback(() => {
    return isPro ? PRO_BANK_LIMIT : FREE_BANK_LIMIT;
  }, [isPro]);

  const addConnection = useCallback(
    async (pluggyItemId: string, institutionName: string) => {
      if (!userId) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('bank_connections').insert({
        user_id: userId,
        pluggy_item_id: pluggyItemId,
        institution_name: institutionName,
      });
      if (error) throw error;
      await fetchConnections();
    },
    [userId, fetchConnections]
  );

  const removeConnection = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('bank_connections').delete().eq('id', id);
      if (error) throw error;
      await fetchConnections();
    },
    [fetchConnections]
  );

  const syncConnection = useCallback(
    async (id: string) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn || !userId) throw new Error('Conexão não encontrada');
      const result = await syncItem(conn.pluggy_item_id, userId);
      await fetchConnections();
      return result;
    },
    [connections, userId, fetchConnections]
  );

  return {
    connections,
    loading,
    canAddBank,
    getBankLimit,
    getExtraBankPrice: () => EXTRA_BANK_PRICE,
    addConnection,
    removeConnection,
    syncConnection,
    refetch: fetchConnections,
  };
}
