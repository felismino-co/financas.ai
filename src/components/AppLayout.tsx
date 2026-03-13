import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { ViewModeProvider, useViewMode } from '@/contexts/ViewModeContext';
import { FamilyMode } from '@/components/FamilyMode';
import { InstallPWA } from '@/components/InstallPWA';
import { AIChat } from '@/components/AIChat';
import { usePlanSync } from '@/hooks/usePlanSync';
import { checkAndSendAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { BirthdayCelebration } from '@/components/BirthdayCelebration';

function AppLayoutContent() {
  usePlanSync();
  useStreak(useAuth().user?.id);
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id && user?.email) checkAndSendAlerts(user.id, user.email);
  }, [user?.id, user?.email]);
  const { userId, viewMode, setViewMode } = useViewMode();
  return (
    <div className="flex min-h-screen bg-background">
      <InstallPWA />
      <BirthdayCelebration />
      <DesktopSidebar />
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full min-h-[100dvh] overflow-y-auto overflow-x-hidden pb-safe-nav touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Outlet context={{ viewMode, setViewMode }} />
      </main>
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40">
        <AIChat />
      </div>
      <BottomNav />
    </div>
  );
}

export default function AppLayout() {
  return (
    <ViewModeProvider>
      <AppLayoutContent />
    </ViewModeProvider>
  );
}
