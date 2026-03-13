import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getScoreLevel, SCORE_POINTS, type ScoreAction } from '@/lib/score';

export function useScore() {
  const addScore = useCallback(async (userId: string, action: ScoreAction): Promise<boolean> => {
    const points = SCORE_POINTS[action];
    if (!points) return false;
    try {
      const { data: profile } = await supabase.from('profiles').select('score').eq('id', userId).single();
      const current = (profile as { score?: number } | null)?.score ?? 0;
      const newScore = Math.min(1000, current + points);
      const level = getScoreLevel(newScore);
      await supabase
        .from('profiles')
        .update({ score: newScore, score_level: level.label })
        .eq('id', userId);
      await supabase.from('score_log').insert({ user_id: userId, action, points }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateStreak = useCallback(async (userId: string): Promise<number> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_days, last_activity_date')
        .eq('id', userId)
        .single();
      const p = profile as { streak_days?: number; last_activity_date?: string } | null;
      const last = p?.last_activity_date;
      const streak = p?.streak_days ?? 0;
      if (!last) {
        await supabase.from('profiles').update({ streak_days: 1, last_activity_date: today }).eq('id', userId);
        return 1;
      }
      const lastDate = new Date(last + 'T00:00:00').getTime();
      const todayDate = new Date(today + 'T00:00:00').getTime();
      const diffDays = Math.round((todayDate - lastDate) / 86400000);
      let newStreak = streak;
      if (diffDays === 0) newStreak = streak;
      else if (diffDays === 1) newStreak = streak + 1;
      else newStreak = 1;
      await supabase.from('profiles').update({ streak_days: newStreak, last_activity_date: today }).eq('id', userId);
      return newStreak;
    } catch {
      return 0;
    }
  }, []);

  return { addScore, updateStreak };
}
