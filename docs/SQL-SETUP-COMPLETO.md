# SQL Setup Completo — FinanceIA

Execute os scripts abaixo **no SQL Editor do Supabase** (Dashboard > SQL Editor) **na ordem indicada** para corrigir os erros 500 (Internal Server Error) em `transactions`, `family_members`, `bills` e `goals`.

---

## 1. Se o banco está vazio: `supabase-setup.sql`

Execute primeiro o arquivo `supabase-setup.sql` para criar todas as tabelas base.

---

## 2. Migrations (na ordem)

### 2.1 `supabase-migration-onboarding.sql`

Adiciona colunas de onboarding, créditos IA e planos em `profiles`.

### 2.2 `supabase-migration-v2.sql`

Adiciona colunas de email/WhatsApp em `profiles`, cria `email_logs` e `bills` (se ainda não existirem).

### 2.3 `supabase-migration-pluggy.sql`

Adiciona `source` e `pluggy_transaction_id` em `transactions` (necessário para evitar erro 500).

---

## 3. Verificação rápida

Após executar, rode no SQL Editor:

```sql
-- Verificar se as tabelas existem
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'transactions', 'bills', 'goals', 'family_members', 'email_logs');

-- Verificar colunas de transactions (deve ter source)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transactions'
AND column_name IN ('source', 'pluggy_transaction_id');
```

---

## 4. Erro 400 em profiles

Se ainda aparecer `profiles?select=email,...` com 400, a coluna `email` não existe em `profiles` (o email está em `auth.users`). O código já foi ajustado para não solicitar `email` em profiles. Faça um novo deploy para garantir que a versão atual está em produção.

---

## 5. Resumo das causas dos erros

| Erro | Causa provável | Solução |
|------|----------------|---------|
| 500 em transactions | Coluna `source` ausente | Rodar `supabase-migration-pluggy.sql` |
| 500 em bills | Tabela `bills` não existe | Rodar `supabase-setup.sql` ou `supabase-migration-v2.sql` |
| 500 em goals | Tabela ou RLS incorreto | Rodar `supabase-setup.sql` |
| 500 em family_members | Tabela ou RLS incorreto | Rodar `supabase-setup.sql` |
| 400 em profiles | Query pede coluna `email` | Deploy da versão atual (sem email em profiles) |
