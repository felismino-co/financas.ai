import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Trash2, Download, Lock, Crown, Check, GraduationCap, Pencil } from 'lucide-react';
import { useState } from 'react';
import { AICreditsBar } from '@/components/AICreditsBar';
import { useAppTour } from '@/components/AppTour';
import { usePlan } from '@/hooks/usePlan';
import { useAlerts } from '@/hooks/useAlerts';
import { WhatsAppConnect } from '@/components/WhatsAppConnect';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { profile, refetchProfile } = useAuthState();
  const { resetAndStartTour } = useAppTour();
  const { isPro } = usePlan();
  const { preferences: alertPrefs, updatePreferences: updateAlertPrefs } = useAlerts();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    budgetAlerts: true,
    closingDay: 1,
  });
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const handleOpenEditProfile = () => {
    setEditName(profile?.name ?? '');
    setEditAvatar(profile?.avatar_url ?? '');
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      await supabase.from('profiles').update({
        name: editName.trim() || profile?.name,
        avatar_url: editAvatar.trim() || null,
      }).eq('id', user.id);
      await refetchProfile();
      setEditProfileOpen(false);
      toast.success('Perfil atualizado.');
    } catch {
      toast.error('Erro ao salvar.');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.name?.trim() || user?.email?.split('@')[0] || 'Usuário';
  const initial = (profile?.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-foreground">Perfil & Configurações</h1>
        <AICreditsBar />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6 shadow-card text-center">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto mb-3 overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <h2 className="font-semibold text-foreground">{displayName}</h2>
        <p className="text-sm text-muted-foreground">{user?.email ?? ''}</p>
        <Button variant="outline" size="sm" className="mt-3 border-border text-foreground hover:bg-muted text-xs" onClick={handleOpenEditProfile}>
          <Pencil size={12} className="mr-1" /> Editar perfil
        </Button>
      </motion.div>

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Editar perfil</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-foreground">Nome</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Seu nome" className="mt-1 bg-muted border-border" />
            </div>
            <div>
              <label className="text-sm text-foreground">URL do avatar</label>
              <Input value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} placeholder="https://..." className="mt-1 bg-muted border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfileOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProfile}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground mb-2">Plano Grátis</p>
          <p className="text-xl font-bold text-foreground">R$ 0<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
          <ul className="space-y-1 text-xs text-muted-foreground mt-2">
            <li>• 30 créditos de IA por mês</li>
            <li>• Até 50 lançamentos/mês</li>
            <li>• 1 meta financeira</li>
            <li>• Dashboard básico</li>
            <li>• Sem modo família</li>
          </ul>
          <Button disabled className="w-full mt-3 bg-muted text-muted-foreground cursor-not-allowed text-sm">
            Seu plano atual
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground mb-2">Pro Mensal</p>
          <p className="text-xl font-bold text-foreground">R$ 47<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
          <ul className="space-y-1 text-xs text-muted-foreground mt-2">
            <li>• Créditos de IA ilimitados</li>
            <li>• Lançamentos ilimitados</li>
            <li>• Metas ilimitadas</li>
            <li>• Modo família/casal</li>
            <li>• Insights semanais automáticos</li>
            <li>• Plano mensal personalizado com IA</li>
            <li>• Transcrição de áudio ilimitada</li>
            <li>• Suporte prioritário</li>
          </ul>
          <Button className="w-full mt-3 bg-primary text-primary-foreground text-sm" onClick={() => window.location.href = '#kiwify-mensal'}>
            Assinar por R$47/mês
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-4 shadow-card">
          <span className="text-xs font-semibold text-primary">Economize R$85</span>
          <p className="text-sm font-semibold text-foreground mt-1">Pro Semestral</p>
          <p className="text-xl font-bold text-foreground">R$ 197 <span className="text-xs font-normal text-muted-foreground">/ 6 meses</span></p>
          <p className="text-xs text-muted-foreground">Equivale a R$ 32,83/mês</p>
          <ul className="space-y-1 text-xs text-muted-foreground mt-2">
            <li>• Todos os benefícios do Pro Mensal</li>
          </ul>
          <Button className="w-full mt-3 bg-purple-600 text-white text-sm" onClick={() => window.location.href = '#kiwify-semestral'}>
            Assinar por R$197
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gradient-ai rounded-xl p-4 shadow-card relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-warning/20 text-warning text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Crown size={10} /> Mais popular — Economize R$267
          </div>
          <p className="text-sm font-semibold text-secondary-foreground mb-1">Pro Anual</p>
          <p className="text-2xl font-bold text-secondary-foreground">R$ 297<span className="text-xs font-normal">/ano</span></p>
          <p className="text-xs text-secondary-foreground/80">12x de R$ 24,75</p>
          <ul className="space-y-1 text-xs text-secondary-foreground/80 mt-2">
            <li>• Todos os benefícios do Pro Mensal</li>
            <li>• Acesso antecipado a novas funcionalidades</li>
          </ul>
          <Button className="w-full mt-4 bg-secondary-foreground text-secondary hover:opacity-90 font-semibold text-sm" onClick={() => window.location.href = '#kiwify-anual'}>
            Assinar por R$297/ano
          </Button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-4 shadow-card space-y-4">
        <h3 className="font-semibold text-foreground text-sm">Preferências</h3>
        {[
          { label: 'Notificações por e-mail', key: 'email_alerts_enabled' as const },
          { label: 'Resumo semanal por e-mail', key: 'email_weekly_digest' as const },
          { label: 'Lembrete de contas a pagar', key: 'email_bills_reminder' as const },
          { label: 'Alertas de orçamento', key: 'budgetAlerts' as const },
        ].map(p => (
          <div key={p.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{p.label}</span>
            <Switch
              checked={p.key === 'budgetAlerts' ? preferences.budgetAlerts : (alertPrefs[p.key as keyof typeof alertPrefs] ?? false)}
              onCheckedChange={v => {
                if (p.key === 'budgetAlerts') setPreferences(prev => ({ ...prev, budgetAlerts: v }));
                else updateAlertPrefs({ [p.key]: v });
              }}
            />
          </div>
        ))}
        <WhatsAppConnect />
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Dia de fechamento</span>
          <Select value={String(preferences.closingDay)} onValueChange={v => setPreferences(prev => ({ ...prev, closingDay: Number(v) }))}>
            <SelectTrigger className="w-20 bg-muted border-border text-foreground text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl p-4 shadow-card space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Conta</h3>
        <Button variant="outline" className="w-full justify-start border-border text-foreground hover:bg-muted text-sm" onClick={resetAndStartTour}>
          <GraduationCap size={16} className="mr-2" /> Refazer tutorial
        </Button>
        <Button variant="outline" className="w-full justify-start border-border text-foreground hover:bg-muted text-sm">
          <Lock size={16} className="mr-2" /> Alterar senha
        </Button>
        <Button variant="outline" className="w-full justify-start border-border text-foreground hover:bg-muted text-sm">
          <Download size={16} className="mr-2" /> Exportar meus dados
        </Button>
        <Button variant="outline" onClick={handleLogout} className="w-full justify-start border-border text-foreground hover:bg-muted text-sm">
          <LogOut size={16} className="mr-2" /> Sair da conta
        </Button>
        <Button variant="outline" className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10 text-sm">
          <Trash2 size={16} className="mr-2" /> Excluir conta
        </Button>
      </motion.div>
    </div>
  );
}
