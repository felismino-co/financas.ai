import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Check, Loader2 } from 'lucide-react';

export function WhatsAppConnect() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useAuthState();
  const [phone, setPhone] = useState(profile?.phone_number ?? '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const connected = profile?.whatsapp_connected ?? false;

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    setSent(false);
    try {
      const digits = phone.replace(/\D/g, '');
      const formatted = digits.length >= 10 ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
      await supabase.from('profiles').update({ phone_number: formatted || null }).eq('id', user.id);
      await refetchProfile();
      setPhone(formatted || phone);
      if (formatted) setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card space-y-3">
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
        <MessageCircle size={18} /> WhatsApp
      </h3>
      {connected ? (
        <p className="text-sm text-success flex items-center gap-2">
          <Check size={16} /> Conectado
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Vincule seu número para receber alertas</p>
          <div className="flex gap-2">
            <Input
              placeholder="11999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
            </Button>
          </div>
          {sent && (
            <p className="text-xs text-muted-foreground">
              Envie &quot;conectar&quot; para o número do FinanceIA no WhatsApp para vincular.
            </p>
          )}
        </>
      )}
    </div>
  );
}
