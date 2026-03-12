/**
 * Formata valor para exibição em Real (R$ 0,00).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Converte string do input (ex: "1.234,56") para number.
 */
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/\D/g, '');
  if (!cleaned) return 0;
  return Number(cleaned) / 100;
}

/**
 * Máscara para input: formata enquanto digita (R$ 0,00).
 */
export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = Number(digits) / 100;
  return formatCurrency(num);
}

/**
 * Hook-style: valor numérico para exibição formatada e setter que aceita string do input.
 */
export function useCurrencyMask(
  value: number,
  onChange: (num: number) => void
): { displayValue: string; handleChange: (e: { target: { value: string } }) => void } {
  return {
    displayValue: formatCurrency(value),
    handleChange: (e) => {
      const next = parseCurrencyInput(e.target.value);
      onChange(next);
    },
  };
}
