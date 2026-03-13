import { NavLink, useLocation } from 'react-router-dom';
import { Home, ArrowLeftRight, PieChart, Target, User, FileText, BookOpen, Building2, Wallet } from 'lucide-react';

const items = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transações', dataTour: 'nav-transactions' },
  { path: '/budget', icon: PieChart, label: 'Orçamento', dataTour: 'nav-budget' },
  { path: '/goals', icon: Target, label: 'Metas', dataTour: 'nav-goals' },
  { path: '/bills', icon: FileText, label: 'Dívidas' },
  { path: '/receivables', icon: Wallet, label: 'A Receber' },
  { path: '/banks', icon: Building2, label: 'Bancos' },
  { path: '/education', icon: BookOpen, label: 'Educação' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  const location = useLocation();

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
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-tour={(item as { dataTour?: string }).dataTour}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors shrink-0 min-w-[64px] scroll-snap-align-start ${
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon size={24} className="shrink-0" />
              <span className="text-[11px] font-medium truncate w-full text-center leading-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
