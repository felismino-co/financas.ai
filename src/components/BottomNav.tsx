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
      className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around py-2">
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-tour={(item as { dataTour?: string }).dataTour}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-0 flex-1 ${
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
