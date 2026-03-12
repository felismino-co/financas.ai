import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Notificações em memória (sem tabela no Supabase por enquanto). */
interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  date: string;
}

const defaultNotifications: NotificationItem[] = [];

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(defaultNotifications);
  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="relative p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
          <Bell size={20} className="text-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full text-[10px] font-bold flex items-center justify-center text-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-border p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="font-semibold text-sm text-foreground">Notificações</h4>
          {unread > 0 && (
            <button type="button" onClick={markAllRead} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação.</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`p-3 border-b border-border last:border-0 text-sm ${n.read ? 'text-muted-foreground' : 'text-foreground bg-muted/30'}`}>
                {n.message}
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.date).toLocaleDateString('pt-BR')}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
