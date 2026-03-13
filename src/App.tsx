import { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AuthStateProvider, useAuthState } from "@/contexts/AuthStateContext";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallback";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import BudgetPage from "./pages/BudgetPage";
import GoalsPage from "./pages/GoalsPage";
import InsightsPage from "./pages/InsightsPage";
import ReportsPage from "./pages/ReportsPage";
import ProfilePage from "./pages/ProfilePage";
import PricingPage from "./pages/PricingPage";
import EducationPage from "./pages/EducationPage";
import BillsPage from "./pages/BillsPage";
import ReceivablesPage from "./pages/ReceivablesPage";
import BanksPage from "./pages/BanksPage";
import FinancialProfilePage from "./pages/FinancialProfilePage";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LOADING_TIMEOUT_MS = 3000;

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );
}

/** Redireciona para login se não logado; senão mostra onboarding. */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profileComplete, profile, loading: profileLoading } = useAuthState();
  const { search } = useLocation();
  const [loadingOverride, setLoadingOverride] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawLoading = authLoading || profileLoading;
  useEffect(() => {
    if (!rawLoading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoadingOverride(false);
      return;
    }
    loadingTimeoutRef.current = setTimeout(() => {
      setLoadingOverride(true);
      if (process.env.NODE_ENV === "development") {
        console.log("[AppRoutes] Timeout de loading (3s) — forçando loading = false");
      }
    }, LOADING_TIMEOUT_MS);
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [rawLoading]);

  const loading = rawLoading && !loadingOverride;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const isRefazer = search.includes('refazer=1');
  if (profileComplete && !isRefazer) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Redireciona para login ou onboarding conforme auth/profile. */
function AppGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profileComplete, profile, loading: profileLoading } = useAuthState();
  const [loadingOverride, setLoadingOverride] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawLoading = authLoading || profileLoading;
  useEffect(() => {
    if (!rawLoading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoadingOverride(false);
      return;
    }
    loadingTimeoutRef.current = setTimeout(() => {
      setLoadingOverride(true);
      if (process.env.NODE_ENV === "development") {
        console.log("[AppRoutes] Timeout de loading (3s) — forçando loading = false");
      }
    }, LOADING_TIMEOUT_MS);
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [rawLoading]);

  const loading = rawLoading && !loadingOverride;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profileComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** Redireciona para dashboard ou onboarding se já logado. */
function LoginGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profileComplete, loading: profileLoading } = useAuthState();
  const [loadingOverride, setLoadingOverride] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawLoading = authLoading || profileLoading;
  useEffect(() => {
    if (!rawLoading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoadingOverride(false);
      return;
    }
    loadingTimeoutRef.current = setTimeout(() => {
      setLoadingOverride(true);
    }, LOADING_TIMEOUT_MS);
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [rawLoading]);

  const loading = rawLoading && !loadingOverride;
  if (loading) return <LoadingScreen />;
  if (!user) return <>{children}</>;
  if (!profileComplete) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { profileComplete, profile, loading: profileLoading } = useAuthState();
  const [loadingOverride, setLoadingOverride] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawLoading = authLoading || profileLoading;
  useEffect(() => {
    if (!rawLoading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoadingOverride(false);
      return;
    }
    loadingTimeoutRef.current = setTimeout(() => {
      setLoadingOverride(true);
      if (process.env.NODE_ENV === "development") {
        console.log("[AppRoutes] Timeout de loading (3s) — forçando loading = false");
      }
    }, LOADING_TIMEOUT_MS);
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [rawLoading]);

  const loading = rawLoading && !loadingOverride;

  if (process.env.NODE_ENV === "development") {
    const financialGoal = profile?.financial_goal ?? "(vazio)";
    const reason = !user
      ? "Não logado → /login"
      : !profileComplete
        ? `Profile incompleto (financial_goal="${financialGoal}") → /onboarding`
        : "Profile completo → /dashboard";
    console.log("[AppRoutes]", {
      isAuthenticated: !!user,
      financial_goal: financialGoal,
      profileComplete,
      loading,
      redirecionando: reason,
    });
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/login" element={<LoginGuard><AuthPage /></LoginGuard>} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/onboarding" element={<OnboardingGuard><OnboardingPage /></OnboardingGuard>} />
      <Route element={<AppGuard><AppLayout /></AppGuard>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/financial-profile" element={<FinancialProfilePage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/receivables" element={<ReceivablesPage />} />
        <Route path="/banks" element={<BanksPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthStateProvider>
          <AppRoutes />
        </AuthStateProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
