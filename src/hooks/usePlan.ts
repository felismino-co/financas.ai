import { useAuthState } from '@/contexts/AuthStateContext';

export type PlanType = 'free' | 'pro';

export function usePlan() {
  const { profile } = useAuthState();
  const planType: PlanType = (profile?.plan_type as PlanType) ?? 'free';
  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;

  const isActive = () => {
    if (planType !== 'pro') return false;
    if (!expiresAt) return true;
    return expiresAt > new Date();
  };

  const getPlanStatus = (): PlanType => {
    return isActive() ? 'pro' : 'free';
  };

  const isFeatureAllowed = (feature: string): boolean => {
    if (getPlanStatus() === 'pro') return true;
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
    planType: getPlanStatus(),
    planExpiresAt: expiresAt,
    isPro: getPlanStatus() === 'pro',
    getPlanStatus,
    isFeatureAllowed,
  };
}
