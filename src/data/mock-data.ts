export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string;
  recurring?: boolean;
  frequency?: 'weekly' | 'monthly';
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  limit: number;
  spent: number;
}

export interface Insight {
  id: string;
  type: 'alert' | 'opportunity' | 'achievement' | 'projection';
  title: string;
  description: string;
  icon: string;
}

export interface Notification {
  id: string;
  message: string;
  icon: string;
  read: boolean;
  date: string;
}

export interface UserProfile {
  name: string;
  email: string;
  income: number;
  objective: string;
  financialProfile: string;
  score: number;
  plan: 'free' | 'pro';
  preferences: {
    emailNotifications: boolean;
    budgetAlerts: boolean;
    weeklySummary: boolean;
    closingDay: number;
    currency: string;
  };
}

export const mockUser: UserProfile = {
  name: 'Ana Paula Silva',
  email: 'ana.paula@email.com',
  income: 6500,
  objective: 'Organizar meu orçamento',
  financialProfile: 'Consigo poupar um pouco',
  score: 72,
  plan: 'free',
  preferences: {
    emailNotifications: true,
    budgetAlerts: true,
    weeklySummary: false,
    closingDay: 1,
    currency: 'BRL',
  },
};

export const expenseCategories = [
  'Alimentação', 'Moradia', 'Transporte', 'Saúde',
  'Educação', 'Lazer', 'Assinaturas', 'Roupas', 'Outros'
];

export const incomeCategories = [
  'Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros'
];

export const categoryIcons: Record<string, string> = {
  'Alimentação': '🍔', 'Moradia': '🏠', 'Transporte': '🚗', 'Saúde': '💊',
  'Educação': '📚', 'Lazer': '🎮', 'Assinaturas': '📱', 'Roupas': '👕', 'Outros': '📦',
  'Salário': '💼', 'Freelance': '💻', 'Investimentos': '📈', 'Presente': '🎁',
};

export const categoryColors: Record<string, string> = {
  'Alimentação': '#FF6B6B', 'Moradia': '#4ECDC4', 'Transporte': '#45B7D1', 'Saúde': '#96CEB4',
  'Educação': '#FFEAA7', 'Lazer': '#DDA0DD', 'Assinaturas': '#98D8C8', 'Roupas': '#F7DC6F', 'Outros': '#AEB6BF',
  'Salário': '#00D4AA', 'Freelance': '#7C3AED', 'Investimentos': '#F39C12', 'Presente': '#E74C3C',
};

const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

function d(day: number, monthOffset = 0) {
  const date = new Date(currentYear, currentMonth + monthOffset, day);
  return date.toISOString().split('T')[0];
}

export const mockTransactions: Transaction[] = [
  { id: '1', type: 'income', description: 'Salário', amount: 6500, date: d(5), category: 'Salário', recurring: true, frequency: 'monthly' },
  { id: '2', type: 'expense', description: 'Aluguel', amount: 1800, date: d(5), category: 'Moradia', recurring: true, frequency: 'monthly' },
  { id: '3', type: 'expense', description: 'Supermercado Extra', amount: 487.30, date: d(7), category: 'Alimentação' },
  { id: '4', type: 'expense', description: 'Uber / 99', amount: 156, date: d(8), category: 'Transporte' },
  { id: '5', type: 'expense', description: 'Netflix + Spotify', amount: 55.80, date: d(10), category: 'Assinaturas', recurring: true, frequency: 'monthly' },
  { id: '6', type: 'expense', description: 'Farmácia', amount: 89.90, date: d(11), category: 'Saúde' },
  { id: '7', type: 'income', description: 'Freelance - Logo', amount: 800, date: d(12), category: 'Freelance' },
  { id: '8', type: 'expense', description: 'Restaurante japonês', amount: 134.50, date: d(13), category: 'Alimentação' },
  { id: '9', type: 'expense', description: 'Curso Udemy', amount: 29.90, date: d(14), category: 'Educação' },
  { id: '10', type: 'expense', description: 'Gasolina', amount: 220, date: d(15), category: 'Transporte' },
  { id: '11', type: 'expense', description: 'Condomínio', amount: 450, date: d(5), category: 'Moradia', recurring: true, frequency: 'monthly' },
  { id: '12', type: 'expense', description: 'Shopping - roupas', amount: 320, date: d(16), category: 'Roupas' },
  { id: '13', type: 'expense', description: 'Cinema + pipoca', amount: 78, date: d(17), category: 'Lazer' },
  { id: '14', type: 'expense', description: 'iFood', amount: 167.40, date: d(18), category: 'Alimentação' },
  { id: '15', type: 'income', description: 'Rendimento investimento', amount: 145, date: d(20), category: 'Investimentos' },
];

export const mockGoals: Goal[] = [
  { id: '1', name: 'Viagem', emoji: '✈️', targetAmount: 8000, currentAmount: 4800, deadline: `${currentYear + 1}-06-01`, color: '#00D4AA' },
  { id: '2', name: 'Reserva de Emergência', emoji: '🛡️', targetAmount: 20000, currentAmount: 7000, deadline: `${currentYear + 1}-12-01`, color: '#7C3AED' },
  { id: '3', name: 'Notebook novo', emoji: '💻', targetAmount: 5000, currentAmount: 4000, deadline: `${currentYear}-12-01`, color: '#F39C12' },
];

export const mockBudget: BudgetCategory[] = [
  { id: '1', name: 'Alimentação', icon: '🍔', limit: 900, spent: 789.20 },
  { id: '2', name: 'Moradia', icon: '🏠', limit: 2300, spent: 2250 },
  { id: '3', name: 'Transporte', icon: '🚗', limit: 500, spent: 376 },
  { id: '4', name: 'Lazer', icon: '🎮', limit: 300, spent: 78 },
  { id: '5', name: 'Assinaturas', icon: '📱', limit: 100, spent: 55.80 },
  { id: '6', name: 'Saúde', icon: '💊', limit: 200, spent: 89.90 },
];

export const mockInsights: Insight[] = [
  { id: '1', type: 'alert', title: 'Alimentação acima do esperado', description: 'Você gastou 38% a mais em Alimentação este mês. Reduzindo R$200 nessa categoria, sua meta de viagem será atingida 2 meses antes.', icon: '🔴' },
  { id: '2', type: 'opportunity', title: 'Economize em assinaturas', description: 'Você tem 3 serviços de streaming. Cancelando um, economizaria R$240/ano.', icon: '💡' },
  { id: '3', type: 'achievement', title: 'Notebook quase lá!', description: 'Sua meta "Notebook novo" está em 80%! Com o ritmo atual, você atinge em 2 meses.', icon: '📈' },
  { id: '4', type: 'projection', title: 'Projeção para dezembro', description: 'Mantendo o ritmo atual de poupança, você terá R$12.400 guardados até dezembro.', icon: '🔮' },
];

export const mockNotifications: Notification[] = [
  { id: '1', message: '⚠️ Você atingiu 90% do orçamento de Alimentação', icon: '⚠️', read: false, date: d(18) },
  { id: '2', message: '🎉 Meta "Viagem" atingiu 60% do valor!', icon: '🎉', read: false, date: d(17) },
  { id: '3', message: '📅 Lançamento recorrente: Aluguel vence amanhã', icon: '📅', read: true, date: d(16) },
  { id: '4', message: '💡 Novo insight disponível sobre seus gastos', icon: '💡', read: true, date: d(15) },
];

export const monthlyHistory = [
  { month: 'Jul', income: 6500, expense: 4800 },
  { month: 'Ago', income: 7200, expense: 5100 },
  { month: 'Set', income: 6500, expense: 4600 },
  { month: 'Out', income: 6800, expense: 5300 },
  { month: 'Nov', income: 7100, expense: 4900 },
  { month: 'Dez', income: 7445, expense: 4260 },
];

export const balanceHistory = [
  { month: 'Jul', balance: 1700 },
  { month: 'Ago', balance: 2100 },
  { month: 'Set', balance: 1900 },
  { month: 'Out', balance: 1500 },
  { month: 'Nov', balance: 2200 },
  { month: 'Dez', balance: 3185 },
];
