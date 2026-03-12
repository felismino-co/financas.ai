import { Input } from '@/components/ui/input';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/currency';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Input de valor em Real com formatação 1.234,56 enquanto digita.
 */
export function CurrencyInput({ value, onChange, placeholder = '0,00', className, id, onBlur }: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    onChange(formatted);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}

export { parseCurrencyInput };
