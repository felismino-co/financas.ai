# Configuração do Google OAuth no FinanceAI (Supabase)

Siga este passo a passo para habilitar **Login com Google** no projeto.

---

## 1. Criar projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/).
2. Faça login com sua conta Google.
3. No topo, clique no seletor de projeto e depois em **Novo projeto**.
4. Dê um nome (ex: `FinanceAI`) e clique em **Criar**.
5. Selecione o projeto criado no seletor (canto superior).

---

## 2. Configurar a tela de consentimento OAuth

1. No menu lateral: **APIs e serviços** → **Tela de consentimento OAuth**.
2. Escolha **Externo** (para qualquer conta Google) e clique em **Criar**.
3. Preencha:
   - **Nome do app:** FinanceAI
   - **E-mail de suporte do usuário:** seu e-mail
   - **E-mail do desenvolvedor:** seu e-mail
4. Clique em **Salvar e continuar**.
5. Em **Escopos**: adicione `.../auth/userinfo.email` e `.../auth/userinfo.profile` (se não estiverem).
6. **Salvar e continuar** até concluir a tela de consentimento.

---

## 3. Criar credenciais OAuth 2.0

1. No menu: **APIs e serviços** → **Credenciais**.
2. Clique em **+ Criar credenciais** → **ID do cliente OAuth**.
3. Tipo de aplicativo: **Aplicativo da Web**.
4. Nome: ex. `FinanceAI Web`.
5. Em **URIs de redirecionamento autorizados** adicione **exatamente**:
   - `https://<SEU-PROJECT-REF>.supabase.co/auth/v1/callback`
   - Exemplo: `https://abcdefghijk.supabase.co/auth/v1/callback`
   - Para descobrir: no Supabase, **Project Settings** → **API** → em **Project URL** use o host (ex. `https://xxxx.supabase.co`) e adicione `/auth/v1/callback`.
6. Clique em **Criar**.
7. Copie o **ID do cliente** e o **Segredo do cliente** (mostre o segredo e copie). Guarde em local seguro.

---

## 4. Configurar no Supabase

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard) e abra seu projeto.
2. Menu lateral: **Authentication** → **Providers**.
3. Encontre **Google** e ative (toggle **Enable Sign in with Google**).
4. Cole:
   - **Client ID (for OAuth):** o ID do cliente do Google.
   - **Client Secret (for OAuth):** o segredo do cliente do Google.
5. Clique em **Save**.

---

## 5. URLs de redirect no Google Console (resumo)

No Google Cloud Console → Credenciais → seu cliente OAuth → **URIs de redirecionamento autorizados** deve ter:

| Tipo        | URL |
|------------|-----|
| Redirect   | `https://<PROJECT-REF>.supabase.co/auth/v1/callback` |

Substitua `<PROJECT-REF>` pelo identificador do seu projeto Supabase (está na URL do dashboard e em **Project Settings** → **API**).

Para desenvolvimento local com Supabase local ou tunnel:

- Local: `http://127.0.0.1:54321/auth/v1/callback` (se usar Supabase local).
- Produção: sempre o domínio do Supabase acima.

---

## 6. Redirect após login no app

O app redireciona o usuário para:

- **Produção:** `window.location.origin + '/auth/callback'`  
  Ex.: `https://meuapp.vercel.app/auth/callback`
- **Local:** `http://localhost:5173/auth/callback` (ou a porta do Vite)

O Supabase envia o usuário primeiro para o domínio do Supabase (`/auth/v1/callback`); depois o Supabase redireciona para a **URL configurada no provider** (no código: `redirectTo`). No nosso código usamos `window.location.origin + '/auth/callback'`, então em **Supabase** → **Authentication** → **URL Configuration**:

- **Redirect URLs:** adicione `http://localhost:5173/auth/callback` (dev) e sua URL de produção (ex. `https://meuapp.vercel.app/auth/callback`).

Assim o fluxo fica: Google → Supabase `/auth/v1/callback` → seu app `/auth/callback` → dashboard ou onboarding.

---

## 7. Testar

1. Rode o app: `npm run dev`.
2. Na tela de login, clique em **Continuar com Google**.
3. Escolha uma conta Google e autorize.
4. Você deve voltar para o app em `/auth/callback` e depois ser redirecionado para `/onboarding` (primeira vez) ou `/dashboard` (se o perfil já estiver completo).

Se der erro:

- **Redirect URI mismatch:** a URL em **URIs de redirecionamento autorizados** no Google deve ser exatamente a do Supabase (`https://<ref>.supabase.co/auth/v1/callback`).
- **Redirect URL not allowed:** em Supabase → **Authentication** → **URL Configuration** → **Redirect URLs**, adicione a URL do seu app (ex. `http://localhost:5173/auth/callback`).

---

## 8. Trigger e profile automático

O Supabase já está configurado com um trigger que, ao criar um usuário (incluindo via Google), insere um registro na tabela `profiles` com:

- `id` = `auth.users.id`
- `name` = nome do Google (ou "Usuário")
- `avatar_url` = foto do Google (se existir)

O restante (objetivo, renda, perfil financeiro) é preenchido no **onboarding**. Usuários que entram pelo Google e ainda não completaram o onboarding são enviados para `/onboarding` pelo `AuthCallback`.

---

**Arquivo de referência:** `docs/google-oauth-setup.md`  
**Caminho completo:** `c:\Users\adria\Downloads\Saúde Financeira .ia\financeai-your-smart-money-companion-main\docs\google-oauth-setup.md`
