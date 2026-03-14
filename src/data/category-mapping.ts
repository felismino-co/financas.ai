/** Mapeia categorias de bills (PAYING_CATEGORIES) para categorias de orçamento (expenseCategories) */
import { expenseCategories } from '@/data/mock-data';

const BILL_TO_EXPENSE: Record<string, string> = {
  Aluguel: 'Moradia',
  Condomínio: 'Moradia',
  Energia: 'Moradia',
  Água: 'Moradia',
  Internet: 'Moradia',
  'Plano de saúde': 'Saúde',
  Supermercado: 'Alimentação',
  Transporte: 'Transporte',
  Educação: 'Educação',
  Lazer: 'Lazer',
  Outros: 'Outros',
};

export function mapBillCategoryToExpense(billCategory: string | null): string {
  if (!billCategory) return 'Outros';
  return BILL_TO_EXPENSE[billCategory] ?? (expenseCategories.includes(billCategory as never) ? billCategory : 'Outros');
}
