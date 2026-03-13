import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, Check, Loader2 } from 'lucide-react';

const DEFAULT_PREFS = {
  whatsapp_7days: true,
  whatsapp_3days: true,
  whatsapp_due_day: true,
  whatsapp_receivables: true,
  whatsapp_weekly_summary: true,
  whatsapp_daily_reminder: false,
  whatsapp_weekly_tip: true,
};

const PREF_LABELS: Record<keyof typeof DEFAULT_PREFS, string> = {
  whatsapp_7days: 'Lembrete 7 dias antes de contas',
  whatsapp_3days: 'Lembrete 3 dias antes de contas',
  whatsapp_due_day: 'Lembrete no dia do vencimento',
  whatsapp_receivables: 'Avisos de recebimento',
  whatsapp_weekly_summary: 'Resumo semanal (segunda 8h)',
  whatsapp_daily_reminder: 'Lembrete diário noturno (21h)',
  whatsapp_weekly_tip: 'Dica semanal personalizada',
};

const COMANDOS = [
  'gastei 45 no almoço',
  'recebi 3000 salário',
  'paguei [nome da conta]',
  'recebi [descrição]',
  'saldo',
  'contas',
  'a receber',
  'resumo',
  'metas',
  'ajuda',
  'dica',
];

export function WhatsAppConnect() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useAuthState();
  const [phone, setPhone] = useState(profile?.phone_number ?? '');
  const [loading, setLoading] = useState(false);
  const [showComandos, setShowComandos] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);

  const connected = profile?.whatsapp_connected ?? false;

  useEffect(() => {
    if (profile?.phone_number) setPhone(profile.phone_number);
  }, [profile?.phone_number]);

  useEffect(() => {
    const wp = profile?.whatsapp_preferences as Record<string, boolean> | undefined;
    if (wp && typeof wp === 'object') {
      setPrefs((prev) => ({ ...DEFAULT_PREFS, ...prev, ...wp }));
    }
  }, [profile?.whatsapp_preferences]);

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

  const handlePrefChange = async (key: string, value: boolean) => {
    if (!user?.id) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await supabase.from('profiles').update({ whatsapp_preferences: next }).eq('id', user.id);
      await refetchProfile();
    } catch {
      setPrefs(prefs);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card space-y-3">
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
        <MessageCircle size={18} /> WhatsApp
      </h3>
      {connected ? (
        <div className="space-y-3">
          <p className="text-sm text-success flex items-center gap-2">
            <Check size={16} /> Conectado
          </p>
          <p className="text-xs text-muted-foreground">Envie mensagens para registrar gastos e receitas.</p>
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Preferências de notificação</p>
            {(Object.keys(DEFAULT_PREFS) as (keyof typeof DEFAULT_PREFS)[]).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{PREF_LABELS[key]}</span>
                <Switch
                  checked={prefs[key] ?? DEFAULT_PREFS[key]}
                  onCheckedChange={(v) => handlePrefChange(key, v)}
                />
              </div>
            ))}
          </div>
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
            Adicione o número do bot como contato e envie <strong>conectar</strong> para vincular.
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
