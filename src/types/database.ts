/**
 * Tipos das entidades do banco Supabase (tabelas + auth).
 * Mantidos em sync com docs/supabase-setup.sql
 */

export interface DebtEntry {
  name: string;
  total: number;
  monthly: number;
  rate?: number;
}

export interface Profile {
  id: string;
  name: string;
  monthly_income: number;
  financial_goal: string;
  financial_profile: string;
  financial_score: number;
  avatar_url: string | null;
  created_at: string;
  birth_date?: string | null;
  marital_status?: string | null;
  has_children?: string | null;
  income_type?: string | null;
  income_variability?: string | null;
  financial_behavior?: string | null;
  debts?: DebtEntry[];
  fixed_expenses?: Record<string, number>;
  goals_selected?: string[];
  main_goal?: string | null;
  goal_timeframe?: string | null;
  plans_ahead?: string | null;
  extra_money_behavior?: string | null;
  ai_credits_used?: number;
  ai_credits_limit?: number;
  ai_credits_reset_at?: string | null;
  plan_type?: string;
  plan_expires_at?: string | null;
  tour_completed?: boolean;
  email_alerts_enabled?: boolean;
  email_weekly_digest?: boolean;
  email_bills_reminder?: boolean;
  phone_number?: string | null;
  whatsapp_connected?: boolean;
  preferences?: {
    budget_alert?: boolean;
    weekly_report?: boolean;
    goal_achieved?: boolean;
    monthly_plan?: boolean;
  };
  score?: number;
  score_level?: string;
  streak_days?: number;
  last_activity_date?: string | null;
  skills?: { selected?: string[]; custom?: string };
  income_sources?: Array<{ name: string; amount: number; frequency: string; dueDay?: number }>;
}

export interface Bill {
  id: string;
  user_id: string;
  family_id: string | null;
  description: string;
  amount: number;
  due_day: number;
  type: 'income' | 'expense';
  category: string | null;
  is_recurring: boolean;
  is_variable?: boolean;
  paid_at?: string | null;
  installments?: number;
  paid_installments?: number;
  source?: 'manual' | 'onboarding';
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  family_id: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  recurring: boolean;
  frequency: 'weekly' | 'monthly' | null;
  notes: string | null;
  created_at: string;
  source?: 'manual' | 'pluggy';
  pluggy_transaction_id?: string | null;
}

export interface BankConnection {
  id: string;
  user_id: string;
  pluggy_item_id: string;
  institution_name: string | null;
  status?: 'active' | 'error';
  last_synced_at: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  color: string;
  emoji: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  family_id: string | null;
  category: string;
  limit_amount: number;
  month: number;
  year: number;
  created_at?: string;
}

export interface Family {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  impact: string | null;
  created_at: string;
  read: boolean;
}

// Tipos para inserts (campos opcionais gerados pelo DB)
export type ProfileInsert = Omit<Profile, 'created_at'> & { created_at?: string };
export type TransactionInsert = Omit<Transaction, 'id' | 'created_at'> & { id?: string; created_at?: string };
export type GoalInsert = Omit<Goal, 'id' | 'created_at'> & { id?: string; created_at?: string };
export type BudgetInsert = Omit<Budget, 'id'> & { id?: string; created_at?: string };
export type FamilyInsert = Omit<Family, 'id' | 'created_at'> & { id?: string; created_at?: string };
export type FamilyMemberInsert = Omit<FamilyMember, 'id' | 'joined_at'> & { id?: string; joined_at?: string };
export type InsightInsert = Omit<Insight, 'id' | 'created_at'> & { id?: string; created_at?: string };
export type BillInsert = Omit<Bill, 'id' | 'created_at'> & { id?: string; created_at?: string };
export type BankConnectionInsert = Omit<BankConnection, 'id' | 'created_at'> & { id?: string; created_at?: string };

// Database type for Supabase client (table names → row types)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: Partial<ProfileInsert> };
      transactions: { Row: Transaction; Insert: TransactionInsert; Update: Partial<TransactionInsert> };
      goals: { Row: Goal; Insert: GoalInsert; Update: Partial<GoalInsert> };
      budgets: { Row: Budget; Insert: BudgetInsert; Update: Partial<BudgetInsert> };
      families: { Row: Family; Insert: FamilyInsert; Update: Partial<FamilyInsert> };
      family_members: { Row: FamilyMember; Insert: FamilyMemberInsert; Update: Partial<FamilyMemberInsert> };
      insights: { Row: Insight; Insert: InsightInsert; Update: Partial<InsightInsert> };
      bills: { Row: Bill; Insert: BillInsert; Update: Partial<BillInsert> };
      bank_connections: { Row: BankConnection; Insert: BankConnectionInsert; Update: Partial<BankConnectionInsert> };
    };
  };
}
