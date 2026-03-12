import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';

/**
 * Verifica se o plano expirou e atualiza para free automaticamente.
 * Roda no login e quando o profile é carregado.
 */
export function usePlanSync() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useAuthState();
  const lastCheck = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !profile) return;

    const expiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
    if (profile.plan_type !== 'pro' || !expiresAt) return;

    const now = new Date();
    if (expiresAt > now) return;

    const key = `${user.id}-${expiresAt.toISOString()}`;
    if (lastCheck.current === key) return;
    lastCheck.current = key;

    supabase
      .from('profiles')
      .update({
        plan_type: 'free',
        plan_expires_at: null,
        ai_credits_limit: 30,
      })
      .eq('id', user.id)
      .then(({ error }) => {
        if (!error) refetchProfile();
      });
  }, [user?.id, profile?.plan_type, profile?.plan_expires_at, refetchProfile]);
}
