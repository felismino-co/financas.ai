import { supabase } from '@/lib/supabase';

export const ACHIEVEMENTS: Record<string, { key: string; name: string; emoji: string; desc: string }> = {
  primeira_semente: { key: 'primeira_semente', name: 'Primeira Semente', emoji: '🌱', desc: 'Primeira transação registrada' },
  planejador: { key: 'planejador', name: 'Planejador', emoji: '📝', desc: 'Criar primeiro orçamento' },
  sonhador: { key: 'sonhador', name: 'Sonhador', emoji: '🎯', desc: 'Criar primeira meta' },
  persistente: { key: 'persistente', name: 'Persistente', emoji: '💪', desc: '7 dias seguidos com registro' },
  em_chamas: { key: 'em_chamas', name: 'Em Chamas', emoji: '🔥', desc: '30 dias seguidos' },
  quitador: { key: 'quitador', name: 'Quitador', emoji: '🏆', desc: 'Pagar primeira dívida' },
  educado: { key: 'educado', name: 'Educado', emoji: '💡', desc: 'Ler todas as 5 leis do dinheiro' },
  conectado: { key: 'conectado', name: 'Conectado', emoji: '🏦', desc: 'Conectar primeiro banco' },
  familia_unida: { key: 'familia_unida', name: 'Família Unida', emoji: '👨‍👩‍👧', desc: 'Usar modo família' },
  diversificado: { key: 'diversificado', name: 'Diversificado', emoji: '🚀', desc: 'Ter 3+ fontes de renda' },
  poupador: { key: 'poupador', name: 'Poupador', emoji: '💰', desc: 'Guardar dinheiro por 3 meses' },
  analista: { key: 'analista', name: 'Analista', emoji: '📊', desc: 'Acessar relatórios 10 vezes' },
};

export const ACHIEVEMENT_KEYS = Object.keys(ACHIEVEMENTS) as (keyof typeof ACHIEVEMENTS)[];

export async function checkAndUnlock(userId: string, key: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('achievements').select('id').eq('user_id', userId).eq('achievement_key', key).maybeSingle();
    if (data) return false;
    const { error } = await supabase.from('achievements').insert({ user_id: userId, achievement_key: key });
    return !error;
  } catch {
    return false;
  }
}

export async function unlockAchievement(userId: string, key: string): Promise<boolean> {
  return checkAndUnlock(userId, key);
}

export async function getUnlockedAchievements(userId: string): Promise<string[]> {
  try {
    const { data } = await supabase.from('achievements').select('achievement_key').eq('user_id', userId);
    return (data || []).map((r) => r.achievement_key);
  } catch {
    return [];
  }
}

export async function markLawAsRead(userId: string, lawIndex: number): Promise<boolean> {
  const key = `lei_${lawIndex}`;
  const ok = await checkAndUnlock(userId, key);
  if (!ok) return false;
  const unlocked = await getUnlockedAchievements(userId);
  const lawsRead = unlocked.filter((k) => k.startsWith('lei_'));
  if (lawsRead.length >= 5) await checkAndUnlock(userId, 'educado');
  return true;
}

export async function getLawsRead(userId: string): Promise<number[]> {
  try {
    const unlocked = await getUnlockedAchievements(userId);
    return unlocked
      .filter((k) => k.startsWith('lei_'))
      .map((k) => parseInt(k.replace('lei_', ''), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 5);
  } catch {
    return [];
  }
}
