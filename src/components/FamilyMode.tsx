import { useState } from 'react';
import { Users, User, Plus, LogIn, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFamily } from '@/hooks/useFamily';
import { toast } from 'sonner';

interface FamilyModeProps {
  userId: string | undefined;
  viewMode: 'me' | 'family';
  onViewModeChange: (mode: 'me' | 'family') => void;
}

export function FamilyMode({ userId, viewMode, onViewModeChange }: FamilyModeProps) {
  const { currentFamily, members, loading, error, createFamily, joinFamily, leaveFamily } = useFamily(userId);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTab, setDialogTab] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    setCreating(true);
    try {
      const code = await createFamily(familyName.trim());
      setShowDialog(false);
      setFamilyName('');
      onViewModeChange('family');
      toast.success('Família criada! Compartilhe o código com quem quiser adicionar.');
      setInviteCode(code);
      setDialogTab('join');
      setShowDialog(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar família.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      await joinFamily(inviteCode.trim());
      setShowDialog(false);
      setInviteCode('');
      onViewModeChange('family');
      toast.success('Você entrou na família!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Código inválido.');
    } finally {
      setJoining(false);
    }
  };

  const copyCode = () => {
    if (currentFamily?.invite_code) {
      navigator.clipboard.writeText(currentFamily.invite_code);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveFamily();
      onViewModeChange('me');
      toast.success('Você saiu da família.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao sair.');
    }
  };

  if (!userId || loading) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange('me')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'me' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User size={14} /> Meu perfil
        </button>
        <button
          type="button"
          onClick={() => (currentFamily ? onViewModeChange('family') : setShowDialog(true))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'family' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users size={14} /> Família
        </button>
      </div>
      {currentFamily && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyCode} title="Copiar código de convite">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modo Família</DialogTitle>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex bg-muted rounded-lg p-1 mb-4">
            <button
              type="button"
              onClick={() => setDialogTab('create')}
              className={`flex-1 py-2 rounded-md text-sm font-medium ${dialogTab === 'create' ? 'bg-background shadow' : ''}`}
            >
              Criar família
            </button>
            <button
              type="button"
              onClick={() => setDialogTab('join')}
              className={`flex-1 py-2 rounded-md text-sm font-medium ${dialogTab === 'join' ? 'bg-background shadow' : ''}`}
            >
              Entrar com código
            </button>
          </div>
          {dialogTab === 'create' ? (
            <div className="space-y-3">
              <Input
                placeholder="Nome da família"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="bg-muted border-border"
              />
              <Button onClick={handleCreate} disabled={!familyName.trim() || creating} className="w-full">
                <Plus size={14} className="mr-2" /> Criar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Código de 8 caracteres"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 8))}
                className="bg-muted border-border font-mono"
              />
              <Button onClick={handleJoin} disabled={inviteCode.length < 8 || joining} className="w-full">
                <LogIn size={14} className="mr-2" /> Entrar
              </Button>
            </div>
          )}
          {currentFamily && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Membros: {members.length}</p>
              <Button variant="outline" size="sm" className="w-full text-destructive" onClick={handleLeave}>
                Sair da família
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
