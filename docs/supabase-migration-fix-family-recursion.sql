-- ============================================
-- FinanceAI — Fix: Infinite recursion em family_members
-- ============================================
-- O erro "infinite recursion detected in policy for relation family_members"
-- ocorre porque: family_members policy consulta families, e families policy
-- consulta family_members. Esta migration quebra o ciclo usando uma função
-- SECURITY DEFINER que bypassa RLS.
-- ============================================

-- Função que verifica se o usuário é membro ou dono da família (sem disparar RLS)
CREATE OR REPLACE FUNCTION public.user_can_access_family(family_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families f
    WHERE f.id = family_uuid AND f.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_uuid AND fm.user_id = auth.uid()
  );
$$;

-- Remover policies antigas que causam recursão
DROP POLICY IF EXISTS "family_members_select_own_or_owner" ON public.family_members;
DROP POLICY IF EXISTS "families_select_owner_or_member" ON public.families;

-- Recriar family_members SELECT usando a função (evita consultar families com RLS)
CREATE POLICY "family_members_select_own_or_owner"
  ON public.family_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_can_access_family(family_id)
  );

-- Recriar families SELECT usando a função (evita consultar family_members com RLS)
CREATE POLICY "families_select_owner_or_member"
  ON public.families FOR SELECT
  USING (
    auth.uid() = owner_id
    OR user_can_access_family(id)
  );

-- Atualizar bills policy para usar a função (bills também usa family_members)
DROP POLICY IF EXISTS "bills_select_own_or_family" ON public.bills;
CREATE POLICY "bills_select_own_or_family"
  ON public.bills FOR SELECT
  USING (
    auth.uid() = user_id
    OR (family_id IS NOT NULL AND user_can_access_family(family_id))
  );

-- Atualizar transactions, goals, budgets para usar a função
DROP POLICY IF EXISTS "transactions_select_own_or_family" ON public.transactions;
CREATE POLICY "transactions_select_own_or_family"
  ON public.transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR (family_id IS NOT NULL AND user_can_access_family(family_id))
  );

DROP POLICY IF EXISTS "goals_select_own_or_family" ON public.goals;
CREATE POLICY "goals_select_own_or_family"
  ON public.goals FOR SELECT
  USING (
    auth.uid() = user_id
    OR (family_id IS NOT NULL AND user_can_access_family(family_id))
  );

DROP POLICY IF EXISTS "budgets_select_own_or_family" ON public.budgets;
CREATE POLICY "budgets_select_own_or_family"
  ON public.budgets FOR SELECT
  USING (
    auth.uid() = user_id
    OR (family_id IS NOT NULL AND user_can_access_family(family_id))
  );
