import { useEffect, useRef, useState } from 'react';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i);

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 3;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

interface DateScrollPickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

function ScrollColumn<T>({
  items,
  value,
  onChange,
  format,
}: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.indexOf(value);
    if (idx >= 0) {
      el.scrollTop = idx * ITEM_HEIGHT;
    }
  }, [items, value]);

  const scrollEndRef = useRef<ReturnType<typeof setTimeout>>();
  const handleScroll = () => {
    if (!ref.current) return;
    setIsScrolling(true);
    const scrollTop = ref.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    if (items[clamped] !== value) onChange(items[clamped]);
    clearTimeout(scrollEndRef.current);
    scrollEndRef.current = setTimeout(() => {
      setIsScrolling(false);
      if (!ref.current) return;
      const st = ref.current.scrollTop;
      const i = Math.round(st / ITEM_HEIGHT);
      const c = Math.max(0, Math.min(i, items.length - 1));
      ref.current.scrollTo({ top: c * ITEM_HEIGHT, behavior: 'smooth' });
      if (items[c] !== value) onChange(items[c]);
    }, 150);
  };

  const handleScrollEnd = () => {
    clearTimeout(scrollEndRef.current);
    scrollEndRef.current = setTimeout(() => {
      if (!ref.current) return;
      const st = ref.current.scrollTop;
      const i = Math.round(st / ITEM_HEIGHT);
      const c = Math.max(0, Math.min(i, items.length - 1));
      ref.current.scrollTo({ top: c * ITEM_HEIGHT, behavior: 'smooth' });
      if (items[c] !== value) onChange(items[c]);
    }, 100);
  };

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto scrollbar-hide snap-y snap-mandatory"
      style={{
        height: CONTAINER_HEIGHT,
        WebkitOverflowScrolling: 'touch',
      }}
      onScroll={handleScroll}
      onTouchEnd={handleScrollEnd}
    >
      <div className="h-[132px]" />
      {items.map((item, i) => (
        <div
          key={i}
          className="h-[44px] flex items-center justify-center snap-center text-sm transition-opacity"
          style={{
            opacity: item === value ? 1 : 0.4,
          }}
        >
          {format(item)}
        </div>
      ))}
      <div className="h-[132px]" />
    </div>
  );
}

export function DateScrollPicker({ value, onChange, minDate, maxDate }: DateScrollPickerProps) {
  const initialDate = value || new Date(2000, 0, 1);
  const [day, setDay] = useState(initialDate.getDate());
  const [month, setMonth] = useState(initialDate.getMonth());
  const [year, setYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    const d = new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
    if (d.getTime() !== (value?.getTime() ?? 0)) {
      onChange(d);
    }
  }, [day, month, year]);

  useEffect(() => {
    if (value) {
      setDay(value.getDate());
      setMonth(value.getMonth());
      setYear(value.getFullYear());
    }
  }, [value?.getTime()]);

  const validDays = (() => {
    const maxDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'));
  })();

  return (
    <div className="flex gap-1 border border-border rounded-xl bg-muted/30 overflow-hidden">
      <div className="relative flex-1 min-w-0">
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[44px] border-y-2 border-primary/50 pointer-events-none z-10"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none z-[5] opacity-80" />
        <ScrollColumn
          items={validDays}
          value={String(day).padStart(2, '0')}
          onChange={(v) => setDay(parseInt(v, 10))}
          format={(x) => x}
        />
      </div>
      <div className="relative flex-1 min-w-0">
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[44px] border-y-2 border-primary/50 pointer-events-none z-10"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none z-[5] opacity-80" />
        <ScrollColumn
          items={MONTHS}
          value={MONTHS[month]}
          onChange={(v) => setMonth(MONTHS.indexOf(v))}
          format={(x) => x}
        />
      </div>
      <div className="relative flex-1 min-w-0">
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[44px] border-y-2 border-primary/50 pointer-events-none z-10"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none z-[5] opacity-80" />
        <ScrollColumn
          items={YEARS.map(String)}
          value={String(year)}
          onChange={(v) => setYear(parseInt(v, 10))}
          format={(x) => x}
        />
      </div>
    </div>
  );
}
