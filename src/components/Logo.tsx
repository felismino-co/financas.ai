import { TrendingUp, Zap } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };
  const iconSizes = { sm: 16, md: 22, lg: 32 };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <TrendingUp size={iconSizes[size]} className="text-primary" />
        <Zap size={iconSizes[size] * 0.5} className="text-secondary absolute -top-1 -right-1" />
      </div>
      <span className={`${sizes[size]} font-bold`}>
        <span className="text-foreground">Finance</span>
        <span className="text-gradient-primary">IA</span>
      </span>
    </div>
  );
}
