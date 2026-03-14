import { NavLink, useLocation } from 'react-router-dom';
import { Home, ArrowLeftRight, PieChart, Target, User, Sparkles, FileText, BookOpen, Building2, Wallet, BarChart3, Lock } from 'lucide-react';
import { Logo } from '@/components/Logo';

const mainItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { path: '/budget', icon: PieChart, label: 'Orçamento' },
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

export function DesktopSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border min-h-screen p-4 shrink-0">
      <div className="mb-8"><Logo size="md" /></div>
      <nav className="space-y-1 flex-1">
        {mainItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
        <div className="pt-3 mt-3 border-t border-border">
          <p className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider">Em breve</p>
          {soonItems.map(item => {
            const active = location.pathname === item.path;
            const isBlocked = item.blocked;
            return (
              <NavLink key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isBlocked ? 'opacity-50 text-muted-foreground' : active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                <Lock size={14} className="shrink-0" />
                <item.icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
