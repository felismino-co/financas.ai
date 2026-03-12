import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'pwa_banner_dismissed';
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function shouldShowBanner() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const data = JSON.parse(raw) as { ts: number };
    const diffDays = (Date.now() - data.ts) / (1000 * 60 * 60 * 24);
    return diffDays >= DISMISS_DAYS;
  } catch {
    return true;
  }
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // @ts-expect-error beforeinstallprompt não está tipado em todos os browsers
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (shouldShowBanner()) {
        setVisible(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now() }));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center px-2 pt-2 pointer-events-none">
      <div className="pointer-events-auto max-w-md w-full bg-card border border-border rounded-xl shadow-card p-3 flex items-center gap-3">
        <span className="text-lg">📱</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            Instale o FinanceIA no seu celular
          </p>
          <p className="text-xs text-muted-foreground">
            Acesse seu coach financeiro em modo app, com acesso rápido na tela inicial.
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <Button size="sm" className="h-7 px-3 text-xs" onClick={handleInstall}>
            Instalar
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

