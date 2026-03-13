import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { Palette, RotateCcw } from 'lucide-react';

const PALETTES = [
  { id: 'default', name: 'Padrão Dark', emoji: '🌙', primary: '#00D4AA', bg: '#0f0f1a', card: '#1a1a2e', text: '#f8f8f8', accent: '#8B5CF6' },
  { id: 'light', name: 'Light Mode', emoji: '☀️', primary: '#2563eb', bg: '#f8fafc', card: '#ffffff', text: '#0f172a', accent: '#3b82f6' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', primary: '#0ea5e9', bg: '#0c1929', card: '#132f4c', text: '#e0f2fe', accent: '#38bdf8' },
  { id: 'rose', name: 'Rosa', emoji: '🌸', primary: '#ec4899', bg: '#1a0a12', card: '#2d1520', text: '#fce7f3', accent: '#f472b6' },
  { id: 'orange', name: 'Laranja', emoji: '🍊', primary: '#f97316', bg: '#1c0f05', card: '#2d1a0a', text: '#fff7ed', accent: '#fb923c' },
  { id: 'green', name: 'Verde Natureza', emoji: '🌿', primary: '#22c55e', bg: '#051f0f', card: '#0d3318', text: '#dcfce7', accent: '#4ade80' },
  { id: 'black', name: 'Preto Total', emoji: '⚫', primary: '#ffffff', bg: '#000000', card: '#0a0a0a', text: '#ffffff', accent: '#a3a3a3' },
  { id: 'red', name: 'Vermelho', emoji: '🔴', primary: '#ef4444', bg: '#1a0505', card: '#2d0a0a', text: '#fef2f2', accent: '#f87171' },
] as const;

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 50%';
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function ThemeCustomizer() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useAuthState();
  const themeConfig = (profile?.preferences as { theme?: typeof PALETTES[number] & { customPrimary?: string } })?.theme;
  const [customPrimary, setCustomPrimary] = useState(themeConfig?.customPrimary || '#8B5CF6');
  const [saved, setSaved] = useState(false);

  const applyTheme = (palette: typeof PALETTES[number] | { primary: string; bg: string; card: string; text: string; accent: string }) => {
    const root = document.documentElement;
    root.style.setProperty('--background', hexToHsl(palette.bg));
    root.style.setProperty('--foreground', hexToHsl(palette.text));
    root.style.setProperty('--card', hexToHsl(palette.card));
    root.style.setProperty('--card-foreground', hexToHsl(palette.text));
    root.style.setProperty('--primary', hexToHsl(palette.primary));
    root.style.setProperty('--primary-foreground', hexToHsl(palette.bg));
    root.style.setProperty('--accent', hexToHsl(palette.accent));
    root.style.setProperty('--ring', hexToHsl(palette.primary));
  };

  useEffect(() => {
    const tc = (profile?.preferences as { theme?: { id?: string; customPrimary?: string } })?.theme;
    if (tc) {
      if (tc.customPrimary) {
        setCustomPrimary(tc.customPrimary);
        const darker = (hex: string, amt: number) => {
          const num = parseInt(hex.slice(1), 16);
          const r = Math.max(0, ((num >> 16) & 0xff) - amt);
          const g = Math.max(0, ((num >> 8) & 0xff) - amt);
          const b = Math.max(0, (num & 0xff) - amt);
          return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
        };
        applyTheme({
          primary: tc.customPrimary,
          bg: darker(tc.customPrimary, 80),
          card: darker(tc.customPrimary, 60),
          text: '#ffffff',
          accent: tc.customPrimary,
        });
      } else {
        const pal = PALETTES.find((x) => x.id === tc.id);
        if (pal) {
          applyTheme(pal);
          setCustomPrimary(pal.primary);
        }
      }
    }
  }, [profile?.preferences]);

  const handleSelectPalette = async (pal: typeof PALETTES[number]) => {
    applyTheme(pal);
    setCustomPrimary(pal.primary);
    setSaved(false);
    if (user?.id) {
      const prefs = (profile?.preferences as Record<string, unknown>) ?? {};
      await supabase.from('profiles').update({
        preferences: { ...prefs, theme: { id: pal.id } },
      }).eq('id', user.id);
      await refetchProfile();
      setSaved(true);
    }
  };

  const handleCustomColor = (hex: string) => {
    setCustomPrimary(hex);
    const darker = (h: string, amt: number) => {
      const num = parseInt(h.slice(1), 16);
      const r = Math.max(0, ((num >> 16) & 0xff) - amt);
      const g = Math.max(0, ((num >> 8) & 0xff) - amt);
      const b = Math.max(0, (num & 0xff) - amt);
      return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    };
    applyTheme({
      primary: hex,
      bg: darker(hex, 80),
      card: darker(hex, 60),
      text: '#ffffff',
      accent: hex,
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const prefs = (profile?.preferences as Record<string, unknown>) ?? {};
    await supabase.from('profiles').update({
      preferences: { ...prefs, theme: { customPrimary, id: undefined } },
    }).eq('id', user.id);
    await refetchProfile();
    setSaved(true);
  };

  const handleReset = () => {
    applyTheme(PALETTES[0]);
    setCustomPrimary('#8B5CF6');
    if (user?.id) {
      supabase.from('profiles').update({
        preferences: { ...(profile?.preferences as object), theme: { id: 'default' } },
      }).eq('id', user.id);
      refetchProfile();
    }
    setSaved(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Palette size={18} /> Personalizar aparência
      </h3>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Paletas prontas</p>
        <div className="grid grid-cols-4 gap-2">
          {PALETTES.map((pal) => (
            <button
              key={pal.id}
              type="button"
              onClick={() => handleSelectPalette(pal)}
              className="p-2 rounded-lg border border-border hover:border-primary transition-colors text-left"
            >
              <span className="text-lg">{pal.emoji}</span>
              <p className="text-[10px] truncate mt-1">{pal.name}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Cor primária customizada</p>
        <div className="flex gap-2">
          <Input
            type="color"
            value={customPrimary}
            onChange={(e) => handleCustomColor(e.target.value)}
            className="w-12 h-10 p-1 cursor-pointer"
          />
          <Input
            value={customPrimary}
            onChange={(e) => handleCustomColor(e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value)}
            className="flex-1 font-mono text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>
          {saved ? 'Salvo!' : 'Salvar tema'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcw size={14} className="mr-1" /> Voltar ao original
        </Button>
      </div>
    </div>
  );
}
