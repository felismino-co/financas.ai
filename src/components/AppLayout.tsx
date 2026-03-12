import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { ViewModeProvider, useViewMode } from '@/contexts/ViewModeContext';
import { FamilyMode } from '@/components/FamilyMode';
import { InstallPWA } from '@/components/InstallPWA';
import { AIChat } from '@/components/AIChat';

function AppLayoutContent() {
  const { userId, viewMode, setViewMode } = useViewMode();
  return (
    <div className="flex min-h-screen bg-background">
      <InstallPWA />
      <DesktopSidebar />
      <main className="flex-1 p-4 pb-20 md:pb-4 md:p-6 max-w-4xl mx-auto w-full">
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
