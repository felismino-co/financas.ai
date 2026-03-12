import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { fetchProfile } from '@/hooks/useDashboard';
import { Loader2 } from 'lucide-react';

/**
 * Rota de callback após OAuth (Google). Processa o token da URL,
 * verifica se o usuário tem profile completo e redireciona para
 * /onboarding ou /dashboard.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (!cancelled) setStatus('error');
          navigate('/login', { replace: true });
          return;
        }
        if (!session?.user) {
          if (!cancelled) setStatus('error');
          navigate('/login', { replace: true });
          return;
        }

        const profile = await fetchProfile(session.user.id);
        const hasCompleteProfile = profile && profile.financial_goal !== '' && profile.financial_profile !== 'A definir';

        if (cancelled) return;
        if (hasCompleteProfile) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } catch {
        if (!cancelled) setStatus('error');
        navigate('/login', { replace: true });
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {status === 'processing' ? 'Conectando sua conta...' : 'Algo deu errado. Redirecionando.'}
        </p>
      </div>
    </div>
  );
}
