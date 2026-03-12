import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  mockUser, mockTransactions, mockGoals, mockBudget,
  mockInsights, mockNotifications, UserProfile, Transaction,
  Goal, BudgetCategory, Insight, Notification
} from '@/data/mock-data';

interface FinanceContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  budget: BudgetCategory[];
  setBudget: React.Dispatch<React.SetStateAction<BudgetCategory[]>>;
  insights: Insight[];
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [budget, setBudget] = useState<BudgetCategory[]>(mockBudget);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  return (
    <FinanceContext.Provider value={{
      user, setUser,
      transactions, setTransactions,
      goals, setGoals,
      budget, setBudget,
      insights: mockInsights,
      notifications, setNotifications,
      isAuthenticated, setIsAuthenticated,
      hasCompletedOnboarding, setHasCompletedOnboarding,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
