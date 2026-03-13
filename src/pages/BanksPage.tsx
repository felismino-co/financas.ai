import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBankConnections } from '@/hooks/useBankConnections';
import { getConnectToken, syncItem } from '@/lib/pluggy';
import { PluggyConnect } from 'react-pluggy-connect';
import { motion } from 'framer-motion';
import { Building2, RefreshCw, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useScore } from '@/hooks/useScore';
import { checkAndUnlock } from '@/lib/achievements';

const KIWIFY_BANCO_EXTRA = '#kiwify-banco-extra';

export default function BanksPage() {
  const { user } = useAuth();
  const { addScore } = useScore();
  const navigate = useNavigate();
  const {
    connections,
    loading,
    canAddBank,
    getBankLimit,
    getExtraBankPrice,
    addConnection,
    removeConnection,
    syncConnection,
  } = useBankConnections(user?.id);

  const [showWidget, setShowWidget] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showExtraBankModal, setShowExtraBankModal] = useState(false);

  const openConnect = useCallback(async () => {
    if (!user?.id) return;
    if (!canAddBank()) {
      const limit = getBankLimit();
      if (limit === 0) {
        setShowUpgradeModal(true);
      } else {
        setShowExtraBankModal(true);
      }
      return;
    }
    setLoadingToken(true);
    try {
      const token = await getConnectToken(user.id);
      setConnectToken(token);
      setShowWidget(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao abrir conexão');
    } finally {
      setLoadingToken(false);
    }
  }, [user?.id, canAddBank, getBankLimit]);

  const onSuccess = useCallback(
    async (data: { item: { id: string; connector?: { name?: string } } }) => {
      if (!user?.id) return;
      try {
        const name = data.item.connector?.name || 'Banco';
        await addConnection(data.item.id, name);
        if (user?.id) {
          addScore(user.id, 'bank_connected');
          checkAndUnlock(user.id, 'conectado');
        }
        setShowWidget(false);
        setConnectToken(null);
        toast.success(`Banco ${name} conectado! Sincronizando transações...`);
        const result = await syncItem(data.item.id, user.id);
        toast.success(`${result.transactionsImported} transações importadas do ${name}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar conexão');
      }
    },
    [user?.id, addConnection, addScore]
  );

  const onError = useCallback((err: { message?: string }) => {
    toast.error(err?.message || 'Erro na conexão');
  }, []);

  const onClose = useCallback(() => {
    setShowWidget(false);
    setConnectToken(null);
  }, []);

  const handleSync = useCallback(
    async (id: string) => {
      setSyncingId(id);
      try {
        const conn = connections.find((c) => c.id === id);
        const result = await syncConnection(id);
        toast.success(`${result.transactionsImported} transações importadas do ${conn?.institution_name || 'banco'}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao sincronizar');
      } finally {
        setSyncingId(null);
      }
    },
    [connections, syncConnection]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await removeConnection(id);
        setRemoveId(null);
        toast.success('Banco desconectado.');
      } catch {
        toast.error('Erro ao desconectar.');
      }
    },
    [removeConnection]
  );

  const handleSyncAll = useCallback(async () => {
    for (const c of connections) {
      await handleSync(c.id);
    }
  }, [connections, handleSync]);

  const limit = getBankLimit();
  const isPro = limit > 0;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Contas Bancárias</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte seus bancos e importe transações automaticamente
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-4"
      >
        <p className="text-sm font-medium text-foreground mb-2">Seu plano</p>
        {isPro ? (
          <div>
            <p className="text-muted-foreground text-sm">1 banco incluso no seu plano</p>
            <p className="text-muted-foreground text-sm mt-1">Bancos adicionais: R$ {getExtraBankPrice().toFixed(2)} cada</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">Conecte bancos com o Plano Pro</p>
            <Button size="sm" onClick={() => navigate('/pricing')}>
              Fazer upgrade
            </Button>
          </div>
        )}
      </motion.div>

      {connections.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Bancos conectados</p>
          <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={!!syncingId}>
            {syncingId ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
            Sincronizar todos
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {connections.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Building2 size={24} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{c.institution_name || 'Banco'}</p>
                  <p className="text-xs text-muted-foreground">
                    Última sync:{' '}
                    {c.last_synced_at
                      ? formatDistanceToNow(new Date(c.last_synced_at), { addSuffix: true, locale: ptBR })
                      : 'Nunca'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(c.id)}
                  disabled={syncingId === c.id}
                >
                  {syncingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  <span className="ml-1 hidden sm:inline">Sincronizar</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRemoveId(c.id)} className="text-danger">
                  <Trash2 size={14} />
                  <span className="ml-1 hidden sm:inline">Desconectar</span>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Button
        className="w-full"
        onClick={openConnect}
        disabled={loadingToken || (!canAddBank() && limit === 0)}
      >
        {loadingToken ? <Loader2 size={18} className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
        Conectar novo banco
      </Button>

      {showWidget && connectToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl bg-card border border-border shadow-xl">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-2 flex items-center justify-between z-10">
              <h3 className="font-semibold text-foreground">Conectar banco</h3>
              <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
            </div>
            <div className="min-h-[450px] p-4">
              <PluggyConnect
                connectToken={connectToken}
                onSuccess={onSuccess}
                onError={onError}
                onClose={onClose}
                theme="dark"
                language="pt"
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={(o) => !o && setRemoveId(null)}
        title="Desconectar banco"
        description="Tem certeza? As transações já importadas permanecerão no app."
        confirmLabel="Desconectar"
        onConfirm={() => removeId && handleRemove(removeId)}
      />

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Plano Pro necessário</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Conecte bancos com o Plano Pro. Faça upgrade para importar transações automaticamente.
          </p>
          <Button onClick={() => { setShowUpgradeModal(false); navigate('/pricing'); }}>
            Fazer upgrade
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showExtraBankModal} onOpenChange={setShowExtraBankModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Adicionar banco extra</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Adicionar banco extra: R$ {getExtraBankPrice().toFixed(2)} (pagamento único)
          </p>
          <Button
            onClick={() => {
              setShowExtraBankModal(false);
              window.location.href = KIWIFY_BANCO_EXTRA;
            }}
          >
            Pagar e conectar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
