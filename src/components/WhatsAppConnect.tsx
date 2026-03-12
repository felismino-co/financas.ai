import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Check, Loader2 } from 'lucide-react';

const COMANDOS = [
  'gastei 50 no mercado',
  'despesa 120 combustível',
  'recebi 3000 salário',
  'paguei 80 luz',
  'almoço 35',
  'saldo',
  'resumo',
  'ajuda',
];

export function WhatsAppConnect() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useAuthState();
  const [phone, setPhone] = useState(profile?.phone_number ?? '');
  const [loading, setLoading] = useState(false);
  const [showComandos, setShowComandos] = useState(false);

  const connected = profile?.whatsapp_connected ?? false;

  const handleConnect = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, '');
      const formatted = digits.length >= 10 ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
      await supabase.from('profiles').update({ phone_number: formatted || null, whatsapp_connected: false }).eq('id', user.id);
      await refetchProfile();
      setPhone(formatted || phone);
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
        <div className="space-y-2">
          <p className="text-sm text-success flex items-center gap-2">
            <Check size={16} /> Conectado
          </p>
          <p className="text-xs text-muted-foreground">Envie mensagens para registrar gastos e receitas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Vincule seu número para usar o bot no WhatsApp.</p>
          <div className="flex gap-2">
            <Input
              placeholder="+5511999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
            <Button size="sm" onClick={handleConnect} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Conectar WhatsApp'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Adicione o número do bot como contato e envie <strong>ajuda</strong> para começar.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowComandos(!showComandos)}
        className="text-xs text-primary hover:underline"
      >
        {showComandos ? 'Ocultar comandos' : 'Ver comandos disponíveis'}
      </button>
      {showComandos && (
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          {COMANDOS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
