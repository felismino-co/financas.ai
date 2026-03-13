import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';

export type PlanType = 'free' | 'pro';

export function usePlan() {
  const { user } = useAuth();
  const { refetchProfile } = useAuthState();
  const [planType, setPlanType] = useState<PlanType>('free');
  const [planExpiresAt, setPlanExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!user?.id) {
      setPlanType('free');
      setPlanExpiresAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_type, plan_expires_at')
        .eq('id', user.id)
        .single();
      if (error) {
        setPlanType('free');
        setPlanExpiresAt(null);
        return;
      }
      const p = data as { plan_type?: string; plan_expires_at?: string | null };
      const type = (p?.plan_type as PlanType) ?? 'free';
      const expires = p?.plan_expires_at ? new Date(p.plan_expires_at) : null;

      if (type === 'pro' && expires && expires <= new Date()) {
        await supabase.from('profiles').update({
          plan_type: 'free',
          plan_expires_at: null,
          ai_credits_limit: 30,
        }).eq('id', user.id);
        setPlanType('free');
        setPlanExpiresAt(null);
        refetchProfile();
      } else {
        setPlanType(type);
        setPlanExpiresAt(expires);
      }
    } catch {
      setPlanType('free');
      setPlanExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, refetchProfile]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const isActive = planType === 'pro' && (!planExpiresAt || planExpiresAt > new Date());
  const status: PlanType = isActive ? 'pro' : 'free';

  const isFeatureAllowed = (feature: string): boolean => {
    if (status === 'pro') return true;
    const freeFeatures = ['dashboard', 'transactions_basic', 'one_goal', 'basic_insights'];
    if (freeFeatures.includes(feature)) return true;
    const proFeatures = [
      'unlimited_credits',
      'unlimited_transactions',
      'unlimited_goals',
      'family_mode',
      'weekly_insights',
      'monthly_plan_ai',
      'priority_support',
    ];
    return proFeatures.includes(feature) ? false : true;
  };

  return {
    planType: status,
    planExpiresAt: isActive ? planExpiresAt : null,
    isPro: status === 'pro',
    getPlanStatus: () => status,
    isFeatureAllowed,
    loading,
    refetchPlan: fetchPlan,
  };
}
