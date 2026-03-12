import { NavLink, useLocation } from 'react-router-dom';
import { Home, ArrowLeftRight, PieChart, Target, User, FileText, BookOpen } from 'lucide-react';

const items = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transações', dataTour: 'nav-transactions' },
  { path: '/budget', icon: PieChart, label: 'Orçamento', dataTour: 'nav-budget' },
  { path: '/goals', icon: Target, label: 'Metas', dataTour: 'nav-goals' },
  { path: '/bills', icon: FileText, label: 'Contas' },
  { path: '/education', icon: BookOpen, label: 'Educação' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path} data-tour={(item as { dataTour?: string }).dataTour} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <item.icon size={20} className={active ? 'text-primary' : 'text-muted-foreground'} />
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
