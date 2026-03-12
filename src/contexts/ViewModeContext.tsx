import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFamily } from '@/hooks/useFamily';

type ViewMode = 'me' | 'family';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  familyId: string | null;
  userId: string | undefined;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentFamily } = useFamily(user?.id);
  const [viewMode, setViewMode] = useState<ViewMode>('me');
  const familyId = viewMode === 'family' && currentFamily ? currentFamily.id : null;
  const value = useMemo(
    () => ({ viewMode, setViewMode, familyId, userId: user?.id }),
    [viewMode, familyId, user?.id]
  );
  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  return ctx;
}
