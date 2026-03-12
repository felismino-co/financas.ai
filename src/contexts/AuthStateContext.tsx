import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfile } from '@/hooks/useDashboard';
import type { Profile } from '@/types/database';

interface AuthStateContextType {
  user: ReturnType<typeof useAuth>['user'];
  profile: Profile | null;
  profileComplete: boolean;
  loading: boolean;
  refetchProfile: () => Promise<void>;
  /** Atualiza o profile no estado local (evita loop após onboarding). */
  setProfileLocal: (p: Profile | null) => void;
}

const AuthStateContext = createContext<AuthStateContextType | undefined>(undefined);

export function AuthStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const setProfileLocal = useCallback((p: Profile | null) => {
    setProfile(p);
  }, []);

  const refetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    try {
      const p = await fetchProfile(user.id);
      setProfile(p);
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    fetchProfile(user.id).then((p) => {
      if (!cancelled) setProfile(p);
    }).finally(() => {
      if (!cancelled) setProfileLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const profileComplete = !!(
    profile &&
    profile.financial_goal !== '' &&
    profile.financial_profile !== 'A definir'
  );

  const loading = profileLoading;

  return (
    <AuthStateContext.Provider
      value={{
        user,
        profile,
        profileComplete,
        loading,
        refetchProfile,
        setProfileLocal,
      }}
    >
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthState() {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error('useAuthState must be used within AuthStateProvider');
  return ctx;
}
