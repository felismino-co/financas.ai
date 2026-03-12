import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signUp, signInWithGoogle, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name || undefined);
      }
    } catch {
      // erro já em useAuth.error
    }
  };

  const handleGoogle = async () => {
    clearError();
    try {
      await signInWithGoogle();
    } catch {
      // erro já em useAuth.error
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <p className="text-muted-foreground text-sm">
            Não só veja para onde vai o seu dinheiro. Saiba o que fazer com ele.
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-6">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setIsLogin(true); clearError(); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${isLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); clearError(); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${!isLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Cadastrar
            </button>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name" placeholder="Seu nome"
                    value={name} onChange={e => setName(e.target.value)}
                    className="pl-10 bg-muted border-border focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email" type="email" placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="pl-10 bg-muted border-border focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-muted border-border focus:border-primary focus:ring-primary"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isLogin && (
              <button type="button" className="text-sm text-primary hover:underline">
                Esqueci minha senha
              </button>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:opacity-90 font-semibold">
              {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar conta')}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">ou continue com</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-white border border-border text-foreground hover:bg-muted"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
