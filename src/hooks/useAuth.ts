import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) throw e;
    } catch (err) {
      const msg = (err as AuthError).message;
      if (msg?.includes('Invalid login')) setError('E-mail ou senha incorretos.');
      else if (msg?.includes('Email not confirmed')) setError('Confirme seu e-mail antes de entrar.');
      else setError(msg || 'Erro ao entrar. Tente novamente.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    setError(null);
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || undefined } },
      });
      if (e) throw e;
    } catch (err) {
      const msg = (err as AuthError).message;
      if (msg?.includes('already registered')) setError('Este e-mail já está cadastrado.');
      else if (msg?.includes('Password')) setError('Senha fraca. Use ao menos 6 caracteres.');
      else setError(msg || 'Erro ao criar conta. Tente novamente.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (e) throw e;
    } catch (err) {
      const msg = (err as AuthError).message;
      setError(msg || 'Erro ao conectar com Google.');
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    setError(null);
    setLoading(true);
    try {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (err) {
      setError('Erro ao sair. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearError,
  };
}
