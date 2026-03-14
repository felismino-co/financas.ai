import { NavLink, useLocation } from 'react-router-dom';
import { Home, ArrowLeftRight, PieChart, Target, User, FileText, BookOpen, Building2, Wallet, BarChart3, Lock, Sparkles } from 'lucide-react';

const mainItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transações', dataTour: 'nav-transactions' },
  { path: '/budget', icon: PieChart, label: 'Orçamento', dataTour: 'nav-budget' },
  { path: '/bills', icon: FileText, label: 'Dívidas' },
  { path: '/receivables', icon: Wallet, label: 'A Receber' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

const soonItems = [
  { path: '/banks', icon: Building2, label: 'Bancos', locked: true, blocked: false },
  { path: '/goals', icon: Target, label: 'Metas', locked: true, blocked: true },
  { path: '/education', icon: BookOpen, label: 'Educação', locked: true, blocked: true },
  { path: '/insights', icon: Sparkles, label: 'Insights IA', locked: true, blocked: true },
];

export function BottomNav() {
  const location = useLocation();

  const renderItem = (item: (typeof mainItems)[0] | (typeof soonItems)[0], isBlocked: boolean) => {
    const active = location.pathname === item.path;
    const showLock = (item as { locked?: boolean }).locked;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        data-tour={(item as { dataTour?: string }).dataTour}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors shrink-0 min-w-[64px] scroll-snap-align-start ${
          isBlocked ? 'opacity-50 text-muted-foreground' : active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
        }`}
      >
        <span className="flex items-center gap-1 shrink-0">
          {showLock && <Lock size={14} />}
          <item.icon size={showLock ? 20 : 24} />
        </span>
        <span className="text-[11px] font-medium truncate w-full text-center leading-tight">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <p className="text-[10px] text-muted-foreground text-center py-1 px-2">
        ← Arraste para o lado para ver mais →
      </p>
      <div
        className="flex items-center gap-1 overflow-x-auto overflow-y-hidden py-2 px-2 scrollbar-hide"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x proximity',
        }}
      >
        {mainItems.map(item => renderItem(item, false))}
        <div className="shrink-0 flex flex-col items-center justify-center px-2 border-l border-border">
          <span className="text-[9px] text-muted-foreground/70">Em breve</span>
        </div>
        {soonItems.map(item => renderItem(item, (item as { blocked?: boolean }).blocked ?? false))}
      </div>
    </nav>
  );
}
