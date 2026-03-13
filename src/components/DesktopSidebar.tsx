import { NavLink, useLocation } from 'react-router-dom';
import { Home, ArrowLeftRight, PieChart, Target, User, BarChart3, Sparkles, FileText, BookOpen, Building2, Wallet } from 'lucide-react';
import { Logo } from '@/components/Logo';

const items = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { path: '/budget', icon: PieChart, label: 'Orçamento' },
  { path: '/goals', icon: Target, label: 'Metas' },
  { path: '/bills', icon: FileText, label: 'Dívidas' },
  { path: '/receivables', icon: Wallet, label: 'A Receber' },
  { path: '/banks', icon: Building2, label: 'Bancos' },
  { path: '/education', icon: BookOpen, label: 'Educação' },
  { path: '/insights', icon: Sparkles, label: 'Insights IA' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

export function DesktopSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border min-h-screen p-4 shrink-0">
      <div className="mb-8"><Logo size="md" /></div>
      <nav className="space-y-1 flex-1">
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
