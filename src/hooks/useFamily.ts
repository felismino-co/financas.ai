import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage, getFriendlyError } from '@/lib/supabase-error';
import type { Family, FamilyMember } from '@/types/database';

const INVITE_CODE_LENGTH = 8;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export interface UseFamilyReturn {
  currentFamily: Family | null;
  members: FamilyMember[];
  loading: boolean;
  error: string | null;
  createFamily: (name: string) => Promise<string>;
  joinFamily: (inviteCode: string) => Promise<void>;
  leaveFamily: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useFamily(userId: string | undefined): UseFamilyReturn {
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setCurrentFamily(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: memberRows } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId);
      const myMemberships = (memberRows || []) as FamilyMember[];
      if (myMemberships.length === 0) {
        setCurrentFamily(null);
        setMembers([]);
        setLoading(false);
        return;
      }
      const familyId = myMemberships[0].family_id;
      const { data: familyData, error: famErr } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();
      if (famErr || !familyData) {
        setCurrentFamily(null);
        setMembers([]);
        setLoading(false);
        return;
      }
      setCurrentFamily(familyData as Family);
      const { data: allMembers } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId);
      setMembers((allMembers || []) as FamilyMember[]);
    } catch (err) {
      const msg = getErrorMessage(err, 'Erro ao carregar família.');
      setError(getFriendlyError(msg, 'Erro ao conectar. Verifique as tabelas no banco.'));
      setCurrentFamily(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createFamily = async (name: string): Promise<string> => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    let code = generateInviteCode();
    let exists = true;
    while (exists) {
      const { data } = await supabase.from('families').select('id').eq('invite_code', code).maybeSingle();
      exists = !!data;
      if (exists) code = generateInviteCode();
    }
    const { data: family, error: e1 } = await supabase
      .from('families')
      .insert({ name, owner_id: userId, invite_code: code })
      .select('id')
      .single();
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from('family_members')
      .insert({ family_id: (family as { id: string }).id, user_id: userId, role: 'owner' });
    if (e2) throw e2;
    await fetch();
    return code;
  };

  const joinFamily = async (inviteCode: string) => {
    if (!userId) throw new Error('Usuário não autenticado');
    setError(null);
    const code = inviteCode.trim().toUpperCase();
    const { data: family, error: e1 } = await supabase
      .from('families')
      .select('id')
      .eq('invite_code', code)
      .single();
    if (e1 || !family) throw new Error('Código inválido ou família não encontrada.');
    const { error: e2 } = await supabase
      .from('family_members')
      .insert({ family_id: (family as { id: string }).id, user_id: userId, role: 'member' });
    if (e2) throw e2;
    await fetch();
  };

  const leaveFamily = async () => {
    if (!userId) return;
    setError(null);
    const { error: e } = await supabase
      .from('family_members')
      .delete()
      .eq('user_id', userId);
    if (e) throw e;
    await fetch();
  };

  return {
    currentFamily,
    members,
    loading,
    error,
    createFamily,
    joinFamily,
    leaveFamily,
    refetch: fetch,
  };
}
