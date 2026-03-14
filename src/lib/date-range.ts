import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subYears, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodPreset = 'hoje' | 'semana' | 'mes' | '3meses' | '6meses' | '1ano' | 'custom';

export type TransactionsPeriodPreset = 'hoje' | 'semana' | 'mes' | '3meses' | '1ano' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

export function getRangeForPreset(preset: PeriodPreset | TransactionsPeriodPreset, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  let from: Date;
  let to: Date = now;

  if (preset === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }

  switch (preset) {
    case 'hoje':
      from = startOfDay(now);
      to = endOfDay(now);
      break;
    case 'semana':
      from = startOfWeek(now, { weekStartsOn: 0 });
      to = endOfWeek(now, { weekStartsOn: 0 });
      break;
    case 'mes':
      from = startOfMonth(now);
      to = endOfMonth(now);
      break;
    case '3meses':
      from = startOfMonth(subMonths(now, 2));
      to = endOfMonth(now);
      break;
    case '6meses':
      from = startOfMonth(subMonths(now, 5));
      to = endOfMonth(now);
      break;
    case '1ano':
      from = startOfMonth(subMonths(now, 11));
      to = endOfMonth(now);
      break;
    default:
      from = startOfMonth(now);
      to = endOfMonth(now);
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function getMinCustomDate(): Date {
  return subYears(new Date(), 1);
}

export function formatPeriodLabel(preset: PeriodPreset, customFrom?: string, customTo?: string): string {
  if (preset === 'custom' && customFrom && customTo) {
    const d1 = new Date(customFrom);
    const d2 = new Date(customTo);
    return `${format(d1, 'dd/MM', { locale: ptBR })} até ${format(d2, 'dd/MM', { locale: ptBR })}`;
  }
  const labels: Record<Exclude<PeriodPreset, 'custom'>, string> = {
    hoje: 'Hoje',
    semana: 'Esta semana',
    mes: 'Este mês',
    '3meses': '3 meses',
    '6meses': '6 meses',
    '1ano': '1 ano',
  };
  return labels[preset] ?? 'Este mês';
}
