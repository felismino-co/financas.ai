import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuthState } from '@/contexts/AuthStateContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { celebrateProgress } from '@/lib/confetti';

export function BirthdayCelebration() {
  const { profile } = useAuthState();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.id || !profile?.birth_date || checked) return;
    const today = new Date();
    const birth = new Date(profile.birth_date);
    const isBirthday = today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate();
    if (!isBirthday) {
      setChecked(true);
      return;
    }
    const year = today.getFullYear();
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('birthday_celebrated_year')
        .eq('id', user.id)
        .single();
      const celebrated = (data as { birthday_celebrated_year?: number })?.birthday_celebrated_year;
      if (celebrated === year) {
        setChecked(true);
        return;
      }
      celebrateProgress(100);
      setOpen(true);
      await supabase.from('profiles').update({ birthday_celebrated_year: year }).eq('id', user.id);
      setChecked(true);
    })();
  }, [user?.id, profile?.birth_date, profile?.name, checked]);

  const firstName = profile?.name?.split(' ')[0] ?? 'usuário';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-card border-border text-center" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-2xl">🎂 Feliz aniversário, {firstName}!</DialogTitle>
          <DialogDescription id="birthday-desc">
            Que esse seja o ano da sua independência financeira! 🚀
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2">
          Presente para você: continue registrando suas finanças e conquiste suas metas!
        </p>
      </DialogContent>
    </Dialog>
  );
}
