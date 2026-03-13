# Especificação Arquitetural — UX, Gamificação e Funcionalidades FinanceIA

**Autor:** @architect  
**Data:** 2026-03-11  
**Destinatário:** @dev  
**Status:** Pronto para implementação

---

## Visão Geral

Este documento detalha 8 tarefas para melhorar UX, gamificação e funcionalidades do FinanceIA. O @dev deve implementar na ordem apresentada, executando até o fim.

---

## TAREFA 1 — Menu Mobile Fixo

### Objetivo
Garantir que o menu inferior seja sempre visível, acessível e não sobreponha conteúdo em dispositivos móveis (incluindo iPhone com notch/home indicator).

### Arquivos a modificar
- `src/components/BottomNav.tsx`
- `src/components/AppLayout.tsx`

### Especificação técnica

#### 1.1 BottomNav.tsx
```tsx
// Estrutura do nav
<nav 
  className="fixed bottom-0 left-0 right-0 z-[100] md:hidden"
  style={{ 
    paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
    background: 'rgba(var(--card-rgb, 15 15 26) / 0.95)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderTop: '1px solid hsl(var(--border))'
  }}
>
```
- `z-index`: usar `z-[100]` ou `z-50` (garantir acima de modais e FAB)
- `position: fixed; bottom: 0; left: 0; right: 0`
- Safe area: `padding-bottom: max(0.5rem, env(safe-area-inset-bottom))`
- Fundo: `bg-card/95 backdrop-blur-md` (Tailwind) ou equivalente
- Ícones: 20–24px, label 10–11px abaixo
- Item ativo: `text-primary`, `bg-primary/10` ou ring sutil

#### 1.2 AppLayout.tsx
- No `<main>`: adicionar `pb-24 md:pb-4` (ou `pb-[calc(5rem+env(safe-area-inset-bottom))]`)
- Garantir que o conteúdo principal nunca fique oculto atrás do nav

#### 1.3 Ítens do menu (atualizar labels)
- Manter rotas; alterar label "Contas" → "Dívidas" (Tarefa 4)
- Adicionar "A Receber" → `/receivables` (Tarefa 3)

#### 1.4 Responsividade
- Menu visível apenas em `md:hidden` (mobile)
- Desktop: sidebar existente, sem bottom nav

---

## TAREFA 2 — Onboarding Salva nas Áreas

### Objetivo
Ao concluir o onboarding, persistir automaticamente os dados nas tabelas corretas (bills, goals, transactions).

### Arquivos a modificar
- `src/pages/OnboardingPage.tsx`
- `docs/supabase-migration-onboarding-income-sources.sql` (criar)

### Mapeamento Gastos Fixos → Bills
| Chave fixed_expenses | Categoria bills | due_day |
|---------------------|-----------------|---------|
| rent | Moradia | 10 (ex.) |
| electricity | Moradia | 15 |
| water | Moradia | 15 |
| internet | Assinaturas | 20 |
| transport | Transporte | 1 |
| health | Saúde | 10 |
| education | Educação | 10 |
| installments | Outros | 15 |
| pet | Outros | 15 |
| gym | Lazer | 5 |
| subscriptions | Assinaturas | 15 |
| other (via otherExpenseLabel) | Outros | 15 |

Cada gasto fixo > 0 → `bills.insert({ user_id, description, amount, due_day, type: 'expense', category, is_recurring: true })`

### Dívidas → Bills
- Cada item em `debts[]` → `bills.insert` com:
  - `description`: d.name
  - `amount`: d.monthly (valor da parcela)
  - `due_day`: 15 (padrão) ou permitir escolha
  - `type`: 'expense'
  - `category`: 'Outros' ou 'Parcelas'
  - `is_recurring`: true
  - **Nota:** bills não tem campo "total da dívida" nem "parcelas restantes". Considerar adicionar coluna `notes` com JSON `{ total, installments, paid_installments }` ou criar tabela `debts` separada. Para MVP: salvar como bill com valor mensal; notes: `{"total": X, "installments": N}`.

### Primeira meta → Goals
- Já existe em `handleStart`; garantir que `firstGoalName`, `firstGoalAmount`, `firstGoalDate` sejam persistidos em `goals`.

### Renda → Transactions
- `monthly_income` atual: uma única transação recorrente no primeiro dia do mês.
- **Nova etapa:** "Quantas fontes de renda você tem?" (1, 2, 3, 4+)
- Para cada fonte:
  - Nome (ex: "Salário CLT", "Freelance")
  - Valor mensal estimado
  - Frequência: Semanal | Mensal | Bimestral | Trimestral
  - Dia do recebimento (1–31)
- Salvar cada fonte como `transactions.insert` com `type: 'income'`, `recurring: true`, `frequency: 'weekly'|'monthly'` (bimestral/trimestral = mensal com valor ajustado ou frequency custom).

**Ajuste de schema:** `transactions.frequency` aceita apenas 'weekly'|'monthly'. Para bimestral/trimestral: usar `frequency: 'monthly'` e `amount` = valor por mês (total/2 ou total/3).

### Nova etapa no onboarding
- Inserir após "Sua situação financeira atual" (step de renda).
- Estado: `incomeSources: Array<{ name, amount, frequency, dueDay }>`
- UI: botões 1, 2, 3, 4+; para cada um, form com nome, valor, frequência, dia.
- Ao salvar: loop `incomeSources` → `transactions.insert`.

---

## TAREFA 3 — Aba "A Receber"

### Objetivo
Página de recebíveis (valores a receber) com countdown, badges e notificações.

### Arquivos a criar
- `src/pages/ReceivablesPage.tsx`
- `src/hooks/useReceivables.ts`
- `src/data/receivables-categories.ts`

### SQL (executar no Supabase)
```sql
CREATE TABLE public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  frequency TEXT DEFAULT 'once' CHECK (frequency IN ('once', 'monthly', 'recurring')),
  installments INTEGER DEFAULT 1,
  installment_value NUMERIC(12,2),
  category TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'overdue')),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_receivables_user_id ON public.receivables(user_id);
CREATE INDEX idx_receivables_due_date ON public.receivables(due_date);
CREATE INDEX idx_receivables_status ON public.receivables(status);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receivables_select_own"
  ON public.receivables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "receivables_insert_own"
  ON public.receivables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "receivables_update_own"
  ON public.receivables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "receivables_delete_own"
  ON public.receivables FOR DELETE USING (auth.uid() = user_id);
```

### Categorias
- Pessoa que me deve
- Salário / Renda fixa
- Investimento
- Serviço prestado
- Outros

### Formulário
- Descrição
- Valor total
- Parcelado? Sim/Não → se sim: quantidade de parcelas + valor por parcela
- Data do recebimento
- Frequência: único | mensal | recorrente
- Observação (textarea)
- Categoria

### Card
- Nome, categoria
- Valor, data
- Countdown: "Faltam X dias" (verde >7, amarelo 3–7, vermelho <3 ou atrasado)
- Badge: Pendente | Recebido | Atrasado
- Botão "Marcar como recebido"

### Notificação 5 dias antes
- Opção A: Supabase Edge Function (cron diário) que verifica `due_date = hoje + 5` e envia email.
- Opção B: Cliente verifica ao carregar a página e exibe toast/badge no sino.
- Para MVP: usar `useEffect` em `ReceivablesPage` ou `AppLayout` que, ao montar, busca receivables com `due_date` entre hoje e hoje+5 e exibe toast/badge.

### Rota
- `/receivables` em `App.tsx`
- Adicionar item no BottomNav e DesktopSidebar

---

## TAREFA 4 — Dívidas com Countdown

### Objetivo
Renomear "Contas" para "Dívidas" e adicionar countdown, badges e "Marcar como pago".

### Arquivos a modificar
- `src/components/BottomNav.tsx` — label "Contas" → "Dívidas"
- `src/components/DesktopSidebar.tsx` — idem
- `src/pages/BillsPage.tsx` — títulos, filtros, cards, lógica de countdown

### Manter rota
- `/bills` (não alterar URL)

### Títulos
- "Contas e recebimentos" → "Dívidas e recebimentos"
- "Contas a pagar" → "Dívidas a pagar"
- Menu: "Dívidas"

### Filtros
- Todas | Dívidas mensais | Dívidas deste mês
- Fixas | Variáveis

### Schema bills
- Adicionar coluna `is_variable BOOLEAN DEFAULT false` (para mercado, combustível, farmácia).
- Adicionar coluna `paid_at TIMESTAMPTZ` (para "Marcar como pago").
- Adicionar colunas `installments INTEGER`, `paid_installments INTEGER` para parceladas.

### SQL (migration)
```sql
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS is_variable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS paid_installments INTEGER DEFAULT 0;
```

### Card
- Countdown: "Vence em X dias" (verde >7, amarelo 3–7, vermelho <3 ou vencida)
- Badge: Em dia | Vencendo | Vencida
- Botão "Marcar como pago" → atualiza `paid_at` ou `paid_installments`
- Se parcelada: "Parcela 3/12"
- Badge "Variável" se `is_variable`

---

## TAREFA 5 — Perfil Financeiro Progressivo

### Objetivo
Score dinâmico (0–1000) baseado em ações, não em valor em dinheiro.

### Pontuação
| Ação | Pontos |
|------|--------|
| Transação registrada | +2 |
| Meta criada | +20 |
| Meta atingida | +100 |
| Dívida quitada | +50 |
| 7 dias consecutivos com registro | +30 |
| Conectar banco (Pluggy) | +50 |
| Completar onboarding | +30 |
| Renda extra cadastrada | +25 |

### Níveis
| Faixa | Nível |
|-------|-------|
| 0–100 | Iniciante 🌱 |
| 101–250 | Aprendiz 💡 |
| 251–500 | Organizado ⚡ |
| 501–750 | Estrategista 🎯 |
| 751–950 | Expert 💎 |
| 951–1000 | Mestre Financeiro 👑 |

### Schema
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_level TEXT DEFAULT 'iniciante',
  ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date DATE;
```

### Lógica de atualização
- Criar `src/lib/score.ts` com funções:
  - `addScore(userId, action, points)`
  - `updateStreak(userId)` — verifica `last_activity_date` vs hoje
  - `getScoreLevel(score)` → string do nível
- Chamar `addScore` nos hooks: `useTransactions` (insert), `useGoals` (add, updateProgress), `useBills` (marcar pago), `useBankConnections` (connect), onboarding (complete), etc.

### Dashboard
- Barra de progresso do score (0–1000)
- Nível atual com emoji
- "Faltam X pontos para [próximo nível]"
- Lista "Últimas ações que geraram pontos" (tabela `score_log` ou usar `insights` com type: 'score')

### Opcional: score_log
```sql
CREATE TABLE public.score_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## TAREFA 6 — Gamificação Completa

### 6.1 Celebração por progresso em metas
- 10%: toast "🌱 Você começou! Continue assim!"
- 25%: confetti leve + "💪 Já é 1/4 do caminho!"
- 50%: confetti médio + "⚡ Metade do caminho!"
- 75%: confetti forte + "🎯 Quase lá!"
- 100%: confetti explosivo + tela de celebração (modal/drawer)

### 6.2 Celebração em dívidas
- A cada 25% pago: toast "🎉 Você já pagou X% dessa dívida!"

### 6.3 Insígnias
| Chave | Nome | Descrição |
|-------|------|-----------|
| `primeira_semente` | 🌱 Primeira Semente | Primeira transação |
| `planejador` | 📝 Planejador | Criar primeiro orçamento |
| `sonhador` | 🎯 Sonhador | Criar primeira meta |
| `persistente` | 💪 Persistente | 7 dias seguidos com registro |
| `em_chamas` | 🔥 Em Chamas | 30 dias seguidos |
| `quitador` | 🏆 Quitador | Pagar primeira dívida |
| `educado` | 💡 Educado | Ler todas as 5 leis do dinheiro |
| `conectado` | 🏦 Conectado | Conectar primeiro banco |
| `familia_unida` | 👨‍👩‍👧 Família Unida | Usar modo família |
| `diversificado` | 🚀 Diversificado | 3+ fontes de renda |
| `poupador` | 💰 Poupador | Guardar em 3 meses |

### SQL achievements
```sql
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select_own" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "achievements_insert_own" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Exibição no perfil
- Grid de insígnias conquistadas (coloridas)
- Não conquistadas: cinza com ícone de cadeado
- Tooltip com descrição

### Lógica de desbloqueio
- Criar `src/lib/achievements.ts` com `checkAndUnlock(userId, key)`.
- Chamar nos hooks apropriados (transação, meta, orçamento, etc.).

---

## TAREFA 7 — Educação: 5 Leis do Dinheiro

### Objetivo
Seção "As 5 Leis do Dinheiro" na EducationPage com conteúdo, áudio e insígnia ao completar.

### Arquivos a modificar
- `src/pages/EducationPage.tsx`

### Conteúdo das 5 leis
1. **Lei 1:** "O ouro vem com prazer para quem poupa..." — Guarde 10% de tudo que ganhar.
2. **Lei 2:** "O ouro trabalha com diligência..." — Faça o dinheiro trabalhar por você.
3. **Lei 3:** "O ouro permanece sob a proteção..." — Invista em negócios que conhece.
4. **Lei 4:** "O ouro escapa de quem investe sem sabedoria..." — Não invista no que não entende.
5. **Lei 5:** "O ouro foge de quem força retornos impossíveis..." — Desconfie de retornos extraordinários.

### UI
- 5 cards/barras clicáveis em coluna
- Ao clicar: Drawer ou Sheet com texto completo
- Botões: "🔊 Ouvir" (Web Speech API, pt-BR), "⏹ Parar"
- Marcar lei como lida → salvar em `achievements` ou `profiles.preferences.laws_read: string[]`
- Quando todas lidas → insígnia "💡 Educado"

### Web Speech API
```ts
const utterance = new SpeechSynthesisUtterance(texto);
utterance.lang = 'pt-BR';
window.speechSynthesis.speak(utterance);
// Parar: window.speechSynthesis.cancel();
```

---

## TAREFA 8 — Estimativa de Renda (não definitiva)

### Objetivo
Tratar renda sempre como estimativa, nunca como valor definitivo.

### Onde alterar
- Onboarding
- ProfilePage
- Qualquer label que diga "renda" ou "salário"

### Alterações
- Label: "Estimativa de ganhos mensais"
- Sublabel: "Não se preocupe, isso é só uma estimativa. Você pode ajustar a qualquer momento."
- Placeholder: "Ex: R$ 3.000"
- Após salvar: badge "Estimativa" ao lado do valor
- Botão "Atualizar estimativa" sempre visível
- Nunca usar "renda definitiva" ou "salário fixo"

---

## Ordem de Implementação Recomendada

1. **Tarefa 1** — Menu mobile (rápido, impacto imediato)
2. **SQL** — Executar todas as migrations antes do código
3. **Tarefa 4** — Dívidas (renomear + countdown + schema bills)
4. **Tarefa 3** — A Receber (nova página + tabela)
5. **Tarefa 2** — Onboarding salva nas áreas
6. **Tarefa 5** — Score progressivo
7. **Tarefa 6** — Gamificação (insígnias, celebrações)
8. **Tarefa 7** — 5 Leis do Dinheiro
9. **Tarefa 8** — Estimativa de renda

---

## SQL Consolidado para Execução

Criar arquivo `docs/supabase-migration-ux-gamification.sql` com:

1. Tabela `receivables`
2. Tabela `achievements`
3. Tabela `score_log` (opcional)
4. Colunas em `profiles`: score, score_level, streak_days, last_activity_date
5. Colunas em `bills`: is_variable, paid_at, installments, paid_installments

---

## Referências de Código Existente

- `src/lib/confetti.ts` — `celebrateGoal()` para confetti
- `src/hooks/useBills.ts` — padrão para CRUD
- `src/components/AppLayout.tsx` — estrutura do main
- `src/data/bills-categories.ts` — categorias

---

**Fim da especificação**
