import { useState, useEffect, useCallback } from 'react';
import { getUnlockedAchievements, unlockAchievement as doUnlock } from '@/lib/achievements';

export function useAchievements(userId: string | undefined) {
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) {
      setUnlocked([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getUnlockedAchievements(userId);
      setUnlocked(list);
    } catch {
      setUnlocked([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const unlockAchievement = useCallback(
    async (key: string) => {
      if (!userId) return false;
      const ok = await doUnlock(userId, key);
      if (ok) setUnlocked((prev) => (prev.includes(key) ? prev : [...prev, key]));
      return ok;
    },
    [userId]
  );

  return { unlocked, loading, refetch: fetch, unlockAchievement };
}
