import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useStreak(userId: string | undefined) {
  const updateActivity = useCallback(async () => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_activity_date, streak_days')
      .eq('id', userId)
      .single();
    if (!profile) return;
    const last = profile.last_activity_date as string | null;
    const streak = (profile.streak_days as number) ?? 0;
    if (last === today) return; // já atualizou hoje
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const newStreak = last === yesterdayStr ? streak + 1 : 1;
    await supabase
      .from('profiles')
      .update({ last_activity_date: today, streak_days: newStreak })
      .eq('id', userId);
  }, [userId]);

  useEffect(() => {
    updateActivity();
  }, [updateActivity]);
}
