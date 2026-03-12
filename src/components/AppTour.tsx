import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';

// Tipagem simplificada para evitar depender de tipos do driver.js
type AnyStep = {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    align?: 'start' | 'center' | 'end';
  };
};

const TOUR_STEPS: AnyStep[] = [
  {
    element: '[data-tour="balance-card"]',
    popover: {
      title: '💰 Resumo financeiro',
      description:
        'Aqui está seu resumo financeiro do mês. Veja quanto entrou, saiu e seu saldo atual.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="insights-card"]',
    popover: {
      title: '🤖 Sua IA financeira',
      description:
        'Sua IA financeira pessoal! Ela analisa seus dados e te diz exatamente o que fazer para melhorar.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="fab-transaction"]',
    popover: {
      title: '➕ Chat com IA',
      description:
        'Toque aqui para falar com sua IA financeira. Registre gastos, tire dúvidas ou peça dicas.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="voice-button"]',
    popover: {
      title: '🎤 Registrar por voz',
      description:
        "Registre gastos por voz! Fale algo como: 'Gastei 45 reais no almoço' e a IA adiciona pra você.",
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-transactions"]',
    popover: {
      title: '📋 Transações',
      description:
        'Aqui ficam todos os seus lançamentos. Filtre por mês, categoria ou tipo.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-budget"]',
    popover: {
      title: '📊 Orçamento',
      description:
        'Defina limites de gasto por categoria. A IA te avisa quando estiver perto do limite.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-goals"]',
    popover: {
      title: '🎯 Metas',
      description:
        'Crie e acompanhe seus objetivos financeiros. Veja quanto guardar por mês para chegar lá.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="score-card"]',
    popover: {
      title: '⭐ Score de Saúde Financeira',
      description:
        'Seu Score vai de 0 a 100 e atualiza todo mês com seu progresso!',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="profile-avatar"]',
    popover: {
      title: '👤 Perfil',
      description:
        'No seu perfil você encontra configurações, seu plano atual e pode refazer este tutorial quando quiser.',
      side: 'left',
      align: 'end',
    },
  },
  {
    popover: {
      title: '🎉 Pronto!',
      description:
        'Você conhece o FinanceIA. Agora é hora de lançar seu primeiro gasto e deixar a IA trabalhar por você. Bora! 💪',
      side: 'center',
      align: 'center',
    },
  },
];

export function useAppTour() {
  const { user } = useAuth();
  const { refetchProfile } = useAuthState();

  const startTour = useCallback(async () => {
    try {
      const { driver } = await import('driver.js');
      await import('driver.js/dist/driver.css');

      const driverObj = driver({
        showProgress: true,
        steps: TOUR_STEPS,
        nextBtnText: 'Próximo',
        prevBtnText: 'Anterior',
        doneBtnText: 'Concluir',
        progressText: '{{current}} de {{total}}',
        allowClose: true,
        overlayColor: 'rgba(0,0,0,0.75)',
        overlayOpacity: 0.75,
        stagePadding: 8,
        stageRadius: 8,
        smoothScroll: true,
        animate: true,
        popoverClass: 'app-tour-popover',
        onDestroyed: async () => {
          if (user?.id) {
            await supabase
              .from('profiles')
              .update({ tour_completed: true })
              .eq('id', user.id);
            await refetchProfile();
          }
        },
      });

      driverObj.drive();
    } catch (e) {
      if (import.meta.env.DEV) {
        // Se o driver.js não estiver instalado, apenas loga em desenvolvimento.
        // Isso evita erro 500 no Vite.
        // eslint-disable-next-line no-console
        console.warn('[AppTour] driver.js não encontrado ou falhou ao carregar.', e);
      }
    }
  }, [user?.id, refetchProfile]);

  const resetAndStartTour = useCallback(async () => {
    if (!user?.id) return;
    await supabase
      .from('profiles')
      .update({ tour_completed: false })
      .eq('id', user.id);
    await refetchProfile();
    setTimeout(() => startTour(), 300);
  }, [user?.id, refetchProfile, startTour]);

  return { startTour, resetAndStartTour };
}

export function AppTourAutoStart() {
  const { profile } = useAuthState();
  const { startTour } = useAppTour();

  useEffect(() => {
    if (profile?.tour_completed) return;
    const t = setTimeout(() => startTour(), 800);
    return () => clearTimeout(t);
  }, [profile?.tour_completed, startTour]);

  return null;
}
