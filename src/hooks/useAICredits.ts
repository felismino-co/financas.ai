import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { startOfMonth, isBefore } from 'date-fns';

export const AI_CREDITS_COSTS: Record<string, number> = {
  weekly_insights: 5,
  analyze_audio: 1,
  monthly_plan: 10,
  simulate_scenario: 3,
  chat_guidado: 1,
};

export function useAICredits() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useAuthState();

  const used = profile?.ai_credits_used ?? 0;
  const limit = profile?.ai_credits_limit ?? 30;
  const resetAt = profile?.ai_credits_reset_at
    ? new Date(profile.ai_credits_reset_at)
    : null;

  const getCreditsRemaining = useCallback((): number => {
    const rem = limit - used;
    return Math.max(0, rem);
  }, [limit, used]);

  const resetCreditsIfNewMonth = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date();
    const nextReset = startOfMonth(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const { error } = await supabase
      .from('profiles')
      .update({
        ai_credits_used: 0,
        ai_credits_reset_at: nextReset.toISOString(),
      })
      .eq('id', user.id);
    if (!error) await refetchProfile();
  }, [user?.id, refetchProfile]);

  useEffect(() => {
    if (!user?.id) return;
    const now = new Date();
    const firstOfMonth = startOfMonth(now);
    if (!resetAt) {
      resetCreditsIfNewMonth();
      return;
    }
    if (isBefore(resetAt, firstOfMonth) || resetAt.getTime() <= firstOfMonth.getTime()) {
      resetCreditsIfNewMonth();
    }
  }, [user?.id, resetAt, resetCreditsIfNewMonth]);

  const consumeCredit = useCallback(
    async (action: string): Promise<boolean> => {
      if (!user?.id) return false;
      const cost = AI_CREDITS_COSTS[action] ?? 1;
      const remaining = getCreditsRemaining();
      if (remaining < cost) return false;
      const newUsed = used + cost;
      const { error } = await supabase
        .from('profiles')
        .update({ ai_credits_used: newUsed })
        .eq('id', user.id);
      if (error) return false;
      await refetchProfile();
      return true;
    },
    [user?.id, used, getCreditsRemaining, refetchProfile]
  );

  return {
    used,
    limit,
    remaining: getCreditsRemaining(),
    getCreditsRemaining,
    consumeCredit,
    resetCreditsIfNewMonth,
    isUnlimited: limit >= 999999,
  };
}