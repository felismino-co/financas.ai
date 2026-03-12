import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthState } from '@/contexts/AuthStateContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DebtEntry } from '@/types/database';

const TOTAL_STEPS = 7;

const MARITAL_OPTIONS = ['Solteiro(a)', 'Casado(a) / União estável', 'Divorciado(a)', 'Viúvo(a)'];
const CHILDREN_OPTIONS = ['Não', 'Sim, 1 filho', 'Sim, 2 filhos', 'Sim, 3 ou mais'];
const INCOME_SOURCE_OPTIONS = [
  'CLT (empregado fixo)',
  'MEI / Autônomo',
  'Empresário',
  'Servidor público',
  'Aposentado/Pensionista',
  'Ainda não tenho renda fixa',
];
const INCOME_VARIABILITY_OPTIONS = [
  'Fixa (mesmo valor todo mês)',
  'Variável (muda todo mês)',
  'Mista (parte fixa + parte variável)',
];

const FIXED_EXPENSE_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'rent', label: 'Aluguel / Financiamento', icon: '🏠' },
  { key: 'electricity', label: 'Luz', icon: '💡' },
  { key: 'water', label: 'Água', icon: '💧' },
  { key: 'internet', label: 'Internet / Telefone', icon: '📱' },
  { key: 'transport', label: 'Transporte (combustível, UBER, ônibus)', icon: '🚗' },
  { key: 'health', label: 'Plano de saúde', icon: '🏥' },
  { key: 'education', label: 'Educação (escola, faculdade, cursos)', icon: '🎓' },
  { key: 'installments', label: 'Parcelas fixas (carnês, financiamentos)', icon: '💳' },
  { key: 'pet', label: 'Pet', icon: '🐾' },
  { key: 'gym', label: 'Academia / Bem-estar', icon: '🏋️' },
  { key: 'subscriptions', label: 'Assinaturas (streaming, apps)', icon: '📺' },
];

const GOAL_OPTIONS = [
  { id: 'sair_dividas', label: 'Sair das dívidas', icon: '🆘' },
  { id: 'reserva_emergencia', label: 'Criar reserva de emergência', icon: '🛡️' },
  { id: 'comprar_imovel', label: 'Comprar imóvel', icon: '🏠' },
  { id: 'comprar_veiculo', label: 'Comprar veículo', icon: '🚗' },
  { id: 'viagem', label: 'Fazer uma viagem', icon: '✈️' },
  { id: 'investir', label: 'Começar a investir', icon: '📈' },
  { id: 'educacao', label: 'Pagar educação (minha ou filhos)', icon: '🎓' },
  { id: 'aposentadoria', label: 'Planejar aposentadoria', icon: '👴' },
  { id: 'negocio', label: 'Abrir um negócio', icon: '💼' },
];

const GOAL_TIMEFRAMES = ['3 meses', '6 meses', '1 ano', '2 anos', 'Mais de 2 anos'];

const PROFILE_CARDS = [
  { id: 'gastador', label: 'Gastador', sub: 'Gasto mais do que ganho', icon: '🔴' },
  { id: 'equilibrado', label: 'Equilibrado', sub: 'Fico no zero a zero', icon: '🟡' },
  { id: 'poupador', label: 'Poupador', sub: 'Consigo guardar um pouco', icon: '🟢' },
  { id: 'investidor', label: 'Investidor', sub: 'Poupo e invisto regularmente', icon: '💎' },
];

const PLANS_AHEAD_OPTIONS = ['Nunca', 'Às vezes', 'Sempre'];
const EXTRA_MONEY_OPTIONS = [
  'Gasto logo',
  'Guardo mas acabo usando',
  'Invisto ou guardo de verdade',
];

const CATEGORY_TO_APP: Record<string, string> = {
  rent: 'Moradia',
  electricity: 'Outros',
  water: 'Outros',
  internet: 'Assinaturas',
  transport: 'Transporte',
  health: 'Saúde',
  education: 'Educação',
  installments: 'Outros',
  pet: 'Outros',
  gym: 'Lazer',
  subscriptions: 'Assinaturas',
  other: 'Outros',
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [hasChildren, setHasChildren] = useState('');

  const [incomeSource, setIncomeSource] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(3000);
  const [incomeVariability, setIncomeVariability] = useState('');

  const [fixedExpenses, setFixedExpenses] = useState<Record<string, number>>({});
  const [otherExpenseLabel, setOtherExpenseLabel] = useState('');
  const [otherExpenseValue, setOtherExpenseValue] = useState<number>(0);

  const [hasDebts, setHasDebts] = useState(false);
  const [debts, setDebts] = useState<DebtEntry[]>([]);

  const [goalsSelected, setGoalsSelected] = useState<string[]>([]);
  const [mainGoal, setMainGoal] = useState('');
  const [goalTimeframe, setGoalTimeframe] = useState('');
  const [goalOther, setGoalOther] = useState('');

  const [financialProfileCard, setFinancialProfileCard] = useState('');
  const [plansAhead, setPlansAhead] = useState('');
  const [extraMoneyBehavior, setExtraMoneyBehavior] = useState('');

  const [firstGoalName, setFirstGoalName] = useState('');
  const [firstGoalAmount, setFirstGoalAmount] = useState('');
  const [firstGoalDate, setFirstGoalDate] = useState('');

  const { user } = useAuth();
  const { refetchProfile, setProfileLocal, profile: currentProfile } = useAuthState();
  const navigate = useNavigate();

  const toggleGoal = (id: string) => {
    setGoalsSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const addDebt = () => {
    setDebts((prev) => [...prev, { name: '', total: 0, monthly: 0 }]);
  };
  const updateDebt = (i: number, field: keyof DebtEntry, value: string | number) => {
    setDebts((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeDebt = (i: number) => {
    setDebts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const totalFixedExpenses = () => {
    let t = Object.values(fixedExpenses).reduce((a, b) => a + b, 0);
    if (otherExpenseLabel.trim()) t += otherExpenseValue;
    return t;
  };

  const totalDebts = () => debts.reduce((a, d) => a + d.total, 0);
  const totalDebtMonthly = () => debts.reduce((a, d) => a + d.monthly, 0);

  const getScore = () => {
    let s = 50;
    if (financialProfileCard === 'investidor') s += 30;
    else if (financialProfileCard === 'poupador') s += 15;
    else if (financialProfileCard === 'equilibrado') s += 5;
    if (hasDebts && debts.length > 0) s -= Math.min(20, debts.length * 5);
    const sobra = monthlyIncome - totalFixedExpenses() - totalDebtMonthly();
    if (sobra > monthlyIncome * 0.2) s += 10;
    else if (sobra > 0) s += 5;
    if (plansAhead === 'Sempre') s += 5;
    if (extraMoneyBehavior === 'Invisto ou guardo de verdade') s += 10;
    return Math.max(0, Math.min(100, s));
  };

  const getTitle = (s: number) => {
    if (s >= 80) return 'Perfil: Investidor Consciente 💎';
    if (s >= 60) return 'Perfil: Em Crescimento 📈';
    if (s >= 40) return 'Perfil: Em Reorganização 🔄';
    return 'Perfil: Recomeço Financeiro 🚀';
  };

  const getRecommendations = () => {
    const recs: string[] = [];
    const sobra = monthlyIncome - totalFixedExpenses() - totalDebtMonthly();
    if (hasDebts && debts.length > 0) {
      recs.push('Priorize quitar as dívidas com maior juros. Pagar mais que o mínimo acelera a saída do vermelho.');
    }
    if (sobra > 0) {
      recs.push('Reserve pelo menos 10% da sua sobra para uma reserva de emergência. Comece com um valor fixo todo mês.');
    } else if (sobra < 0) {
      recs.push('Seus gastos fixos e dívidas superam sua renda. Revise categorias e corte o que for possível até equilibrar.');
    }
    recs.push('Acompanhe seus gastos no app todo mês e ajuste o orçamento conforme sua realidade.');
    return recs.slice(0, 3);
  };

  const suggestedMonthly = () => {
    const sobra = monthlyIncome - totalFixedExpenses() - totalDebtMonthly();
    const goalVal = Number(firstGoalAmount) || 0;
    if (goalVal <= 0 || sobra <= 0) return { monthly: 0, months: 0 };
    const months = Math.ceil(goalVal / Math.max(1, sobra * 0.3));
    const monthly = Math.ceil(goalVal / months);
    return { monthly, months };
  };

  const canNext = () => {
    if (step === 0)
      return !!fullName.trim() && !!maritalStatus && !!hasChildren;
    if (step === 1)
      return !!incomeSource && !!incomeVariability && monthlyIncome >= 500;
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return goalsSelected.length > 0 && !!mainGoal && !!goalTimeframe;
    if (step === 5)
      return !!financialProfileCard && !!plansAhead && !!extraMoneyBehavior;
    if (step === 6) return !!firstGoalName.trim() && !!firstGoalAmount && Number(firstGoalAmount) > 0;
    return true;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else setShowDiagnosis(true);
  };

  const handleStart = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const score = getScore();
      const financialProfileLabel =
        PROFILE_CARDS.find((c) => c.id === financialProfileCard)?.label ?? financialProfileCard;
      const profilePayload = {
        name: (fullName.trim() || currentProfile?.name) ?? '',
        monthly_income: monthlyIncome,
        financial_goal: mainGoal || firstGoalName,
        financial_profile: financialProfileLabel,
        financial_score: score,
        birth_date: birthDate || null,
        marital_status: maritalStatus || null,
        has_children: hasChildren || null,
        income_type: incomeSource || null,
        income_variability: incomeVariability || null,
        financial_behavior: financialProfileCard || null,
        debts: hasDebts ? debts : [],
        fixed_expenses: fixedExpenses,
        goals_selected: goalsSelected,
        main_goal: mainGoal || null,
        goal_timeframe: goalTimeframe || null,
        plans_ahead: plansAhead || null,
        extra_money_behavior: extraMoneyBehavior || null,
        tour_completed: currentProfile?.tour_completed ?? false,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', user.id);
      if (profileError) throw profileError;

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      for (const [key, value] of Object.entries(fixedExpenses)) {
        if (!value || value <= 0) continue;
        const label = FIXED_EXPENSE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
        const category = CATEGORY_TO_APP[key] ?? 'Outros';
        await supabase.from('transactions').insert({
          user_id: user.id,
          family_id: null,
          description: label,
          amount: value,
          type: 'expense',
          category,
          date: firstDay,
          recurring: true,
          frequency: 'monthly',
          notes: 'Gasto fixo (onboarding)',
        });
      }
      if (otherExpenseLabel.trim() && otherExpenseValue > 0) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          family_id: null,
          description: otherExpenseLabel.trim(),
          amount: otherExpenseValue,
          type: 'expense',
          category: 'Outros',
          date: firstDay,
          recurring: true,
          frequency: 'monthly',
          notes: 'Gasto fixo (onboarding)',
        });
      }

      if (firstGoalName.trim() && firstGoalAmount && Number(firstGoalAmount) > 0) {
        let deadline = firstGoalDate;
        if (deadline && deadline.length === 7) {
          const [y, m] = deadline.split('-').map(Number);
          deadline = new Date(y, m, 0).toISOString().split('T')[0];
        }
        if (!deadline) {
          const d = new Date();
          d.setFullYear(d.getFullYear() + 1);
          deadline = d.toISOString().split('T')[0];
        }
        await supabase.from('goals').insert({
          user_id: user.id,
          family_id: null,
          name: firstGoalName.trim(),
          target_amount: Number(firstGoalAmount),
          current_amount: 0,
          deadline,
          color: '#00D4AA',
          emoji: '🎯',
        });
      }

      const updatedProfile = {
        id: user.id,
        name: (fullName.trim() || currentProfile?.name) ?? '',
        monthly_income: monthlyIncome,
        financial_goal: mainGoal || firstGoalName,
        financial_profile: financialProfileLabel,
        financial_score: score,
        avatar_url: currentProfile?.avatar_url ?? null,
        created_at: currentProfile?.created_at ?? new Date().toISOString(),
        birth_date: birthDate || null,
        marital_status: maritalStatus || null,
        has_children: hasChildren || null,
        income_type: incomeSource || null,
        income_variability: incomeVariability || null,
        financial_behavior: financialProfileCard || null,
        debts: hasDebts ? debts : [],
        fixed_expenses: fixedExpenses,
        goals_selected: goalsSelected,
        main_goal: mainGoal || null,
        goal_timeframe: goalTimeframe || null,
        plans_ahead: plansAhead || null,
        extra_money_behavior: extraMoneyBehavior || null,
      } as typeof currentProfile;
      setProfileLocal(updatedProfile);
      await refetchProfile();
      toast.success('Perfil salvo! Bem-vindo ao FinanceIA.');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (showDiagnosis) {
    const score = getScore();
    const sobra = monthlyIncome - totalFixedExpenses() - totalDebtMonthly();
    const recs = getRecommendations();
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-6 text-center"
        >
          <span className="text-4xl">✨</span>
          <h2 className="text-2xl font-bold text-foreground">Diagnóstico personalizado</h2>
          <div className="relative mx-auto w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="10"
                strokeDasharray={`${(score / 100) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-foreground">
              {score}
            </span>
          </div>
          <p className="text-lg font-semibold text-primary">{getTitle(score)}</p>
          <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-medium text-foreground">Resumo</p>
            <p className="text-xs text-muted-foreground">
              Renda: R$ {monthlyIncome.toLocaleString('pt-BR')} · Fixos: R${' '}
              {totalFixedExpenses().toLocaleString('pt-BR')} · Sobra estimada: R${' '}
              {sobra.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="space-y-3">
            {recs.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-card border border-border rounded-lg p-4 text-left text-sm text-foreground"
              >
                <span className="text-primary mr-2">💡</span>
                {r}
              </motion.div>
            ))}
          </div>
          <Button
            onClick={handleStart}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground font-semibold"
          >
            {saving ? 'Salvando...' : 'Começar minha jornada financeira'} <ArrowRight size={16} className="ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-4 flex justify-center">
        <Logo size="sm" />
      </div>
      <div className="px-6 mb-4">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Etapa {step + 1} de {TOTAL_STEPS}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold text-foreground text-center">
                Olá! Vamos te conhecer melhor 👋
              </h2>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome completo"
                className="bg-muted border-border"
              />
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Data de nascimento</label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Estado civil</p>
                <div className="space-y-2">
                  {MARITAL_OPTIONS.map((o) => (
                    <label
                      key={o}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="marital"
                        checked={maritalStatus === o}
                        onChange={() => setMaritalStatus(o)}
                      />
                      <span className="text-sm text-foreground">{o}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Tem filhos?</p>
                <div className="space-y-2">
                  {CHILDREN_OPTIONS.map((o) => (
                    <label
                      key={o}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="children"
                        checked={hasChildren === o}
                        onChange={() => setHasChildren(o)}
                      />
                      <span className="text-sm text-foreground">{o}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold text-foreground text-center">
                Sua situação financeira atual
              </h2>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Principal fonte de renda</p>
                <div className="space-y-2">
                  {INCOME_SOURCE_OPTIONS.map((o) => (
                    <label
                      key={o}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="incomeSource"
                        checked={incomeSource === o}
                        onChange={() => setIncomeSource(o)}
                      />
                      <span className="text-sm text-foreground">{o}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Renda mensal líquida aproximada (R$)
                </label>
                <input
                  type="range"
                  min={500}
                  max={30000}
                  step={100}
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>R$ 500</span>
                  <span className="font-semibold text-foreground">
                    R$ {monthlyIncome.toLocaleString('pt-BR')}
                  </span>
                  <span>R$ 30.000</span>
                </div>
                <Input
                  type="number"
                  min={500}
                  max={30000}
                  value={monthlyIncome || ''}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
                  className="mt-2 bg-muted border-border"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Sua renda é:</p>
                <div className="space-y-2">
                  {INCOME_VARIABILITY_OPTIONS.map((o) => (
                    <label
                      key={o}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="variability"
                        checked={incomeVariability === o}
                        onChange={() => setIncomeVariability(o)}
                      />
                      <span className="text-sm text-foreground">{o}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-foreground text-center">
                Seus gastos fixos mensais
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                Preencha os gastos que você tem todo mês. Deixe em branco os que não se aplicam.
              </p>
              <div className="space-y-3">
                {FIXED_EXPENSE_CATEGORIES.map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <span className="flex-1 text-sm text-foreground">{label}</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0"
                      value={fixedExpenses[key] ?? ''}
                      onChange={(e) =>
                        setFixedExpenses((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-28 bg-muted border-border text-right"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <span className="text-lg">📌</span>
                  <Input
                    placeholder="Outro gasto fixo"
                    value={otherExpenseLabel}
                    onChange={(e) => setOtherExpenseLabel(e.target.value)}
                    className="flex-1 bg-muted border-border"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="R$"
                    value={otherExpenseValue || ''}
                    onChange={(e) => setOtherExpenseValue(Number(e.target.value) || 0)}
                    className="w-28 bg-muted border-border text-right"
                  />
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 mt-4">
                <p className="text-sm font-semibold text-foreground">
                  Seus gastos fixos somam: R$ {totalFixedExpenses().toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês
                </p>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-foreground text-center">
                Suas dívidas atuais
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                Honestidade aqui vai te ajudar muito!
              </p>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <span className="text-sm font-medium text-foreground">Tenho dívidas atualmente</span>
                <button
                  type="button"
                  onClick={() => setHasDebts(!hasDebts)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${hasDebts ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${hasDebts ? 'left-7' : 'left-1'}`}
                  />
                </button>
              </div>
              {hasDebts && (
                <>
                  {debts.map((d, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground">Dívida {i + 1}</span>
                        <button type="button" onClick={() => removeDebt(i)} className="text-destructive">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <Input
                        placeholder="Nome (ex: Cartão Nubank)"
                        value={d.name}
                        onChange={(e) => updateDebt(i, 'name', e.target.value)}
                        className="bg-muted border-border"
                      />
                      <Input
                        type="number"
                        placeholder="Valor total (R$)"
                        value={d.total || ''}
                        onChange={(e) => updateDebt(i, 'total', Number(e.target.value) || 0)}
                        className="bg-muted border-border"
                      />
                      <Input
                        type="number"
                        placeholder="Parcela mensal (R$)"
                        value={d.monthly || ''}
                        onChange={(e) => updateDebt(i, 'monthly', Number(e.target.value) || 0)}
                        className="bg-muted border-border"
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addDebt} className="w-full border-border">
                    <Plus size={16} className="mr-2" /> Adicionar outra dívida
                  </Button>
                  {(debts.length > 0) && (
                    <div className="bg-muted rounded-lg p-3 text-sm text-foreground">
                      Total de dívidas: R$ {totalDebts().toLocaleString('pt-BR')} | Parcelas/mês: R${' '}
                      {totalDebtMonthly().toLocaleString('pt-BR')}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-foreground text-center">
                Seus objetivos financeiros
              </h2>
              <p className="text-sm text-muted-foreground text-center">O que você quer conquistar? (marque vários)</p>
              <div className="space-y-2">
                {GOAL_OPTIONS.map((g) => (
                  <label
                    key={g.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                      goalsSelected.includes(g.id) ? 'border-primary bg-primary/10' : 'border-border bg-card'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={goalsSelected.includes(g.id)}
                      onChange={() => toggleGoal(g.id)}
                    />
                    <span className="text-lg">{g.icon}</span>
                    <span className="text-sm text-foreground">{g.label}</span>
                  </label>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Outro (escreva)"
                    value={goalOther}
                    onChange={(e) => setGoalOther(e.target.value)}
                    className="flex-1 bg-muted border-border"
                  />
                  {goalOther.trim() && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setGoalsSelected((p) => (p.includes(goalOther) ? p : [...p, goalOther]));
                        setGoalOther('');
                      }}
                    >
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Qual é o seu principal objetivo agora?
                </label>
                <select
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-muted text-foreground"
                >
                  <option value="">Selecione</option>
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.id} value={g.label}>
                      {g.icon} {g.label}
                    </option>
                  ))}
                  {goalsSelected.filter((id) => !GOAL_OPTIONS.find((o) => o.id === id)).map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Em quanto tempo quer atingi-lo?
                </label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_TIMEFRAMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setGoalTimeframe(t)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        goalTimeframe === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-foreground text-center">
                Seu perfil financeiro
              </h2>
              <p className="text-sm text-muted-foreground text-center">Como você se descreve?</p>
              <div className="grid grid-cols-1 gap-3">
                {PROFILE_CARDS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFinancialProfileCard(c.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      financialProfileCard === c.id ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'border-border bg-card'
                    }`}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <p className="font-semibold text-foreground mt-1">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </button>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Você costuma planejar seus gastos com antecedência?
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PLANS_AHEAD_OPTIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setPlansAhead(o)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        plansAhead === o ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Quando sobra dinheiro você:
                </p>
                <div className="space-y-2">
                  {EXTRA_MONEY_OPTIONS.map((o) => (
                    <label
                      key={o}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="extra"
                        checked={extraMoneyBehavior === o}
                        onChange={() => setExtraMoneyBehavior(o)}
                      />
                      <span className="text-sm text-foreground">{o}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-foreground text-center">
                Quase lá! Sua primeira meta 🎯
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                Vamos criar sua primeira meta juntos
              </p>
              <Input
                placeholder="Nome da meta (ex: Reserva de emergência)"
                value={firstGoalName}
                onChange={(e) => setFirstGoalName(e.target.value)}
                className="bg-muted border-border"
              />
              <Input
                type="number"
                placeholder="Valor desejado (R$)"
                value={firstGoalAmount}
                onChange={(e) => setFirstGoalAmount(e.target.value)}
                className="bg-muted border-border"
              />
              <Input
                type="month"
                placeholder="Data limite (mês/ano)"
                value={firstGoalDate}
                onChange={(e) => setFirstGoalDate(e.target.value)}
                className="bg-muted border-border"
              />
              {monthlyIncome > 0 && firstGoalAmount && Number(firstGoalAmount) > 0 && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-sm text-foreground">
                  Com sua renda, guardando R$ {suggestedMonthly().monthly.toLocaleString('pt-BR')}/mês você chega lá
                  em cerca de {suggestedMonthly().months} meses 🚀
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 flex gap-3 border-t border-border">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 border-border text-foreground"
          >
            Voltar
          </Button>
        )}
        <Button
          disabled={!canNext()}
          onClick={handleNext}
          className="flex-1 bg-primary text-primary-foreground font-semibold disabled:opacity-50"
        >
          {step === TOTAL_STEPS - 1 ? 'Ver diagnóstico' : 'Continuar'} <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
