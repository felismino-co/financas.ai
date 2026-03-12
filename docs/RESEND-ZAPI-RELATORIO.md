# Relatório: Resend (Emails) e Z-API (WhatsApp)

## 1. O que foi implementado

### Resend (Emails)

- **src/lib/email.ts**: Funções `sendBudgetAlert`, `sendWeeklyReport`, `sendGoalAchieved`, `sendMonthlyPlan` que chamam a Edge Function `send-email` com `{ type, to, data }`.
- **supabase/functions/send-email/index.ts**: Edge Function que recebe POST com `{ type, to, data }`, usa Resend API, gera templates HTML para cada tipo:
  - `budget_alert`: card vermelho com % usado, botão "Ver no app"
  - `weekly_report`: resumo receitas/despesas, top gasto
  - `goal_achieved`: celebração com emoji, nome da meta, próximos passos
  - `monthly_plan`: resumo do plano da IA
  - `bills_reminder`: lista de contas a vencer
  - Todos com footer "Cancelar notificações"
- **src/hooks/useAlerts.ts**: `checkAndSendAlerts(userId)` — busca orçamentos, metas, transações; envia alertas conforme preferências; evita duplicatas (1/dia) via `email_logs`.
- **AppLayout**: chama `checkAndSendAlerts` no login.
- **ProfilePage**: seção "Notificações por e-mail" com toggles: Alertas de orçamento, Resumo semanal, Lembrete contas, Metas atingidas, Plano mensal. Salvo em `profiles.preferences` (jsonb).
- **Migration**: coluna `preferences` em `profiles`.

### Z-API (WhatsApp)

- **src/lib/zapi.ts**: `sendWhatsAppMessage(instanceId, token, params)` — POST para Z-API.
- **supabase/functions/whatsapp-webhook/index.ts**: Recebe POST da Z-API, extrai `phone` e `message`, busca usuário por `phone_number`, processa comandos:
  - Padrões: "gastei 50 no mercado", "despesa 120 combustível", "recebi 3000 salário", "paguei 80 luz", "almoço 35"
  - Comandos: "saldo", "resumo", "ajuda"
  - Usa Gemini para mensagens ambíguas
  - Salva transação no Supabase e responde: "✅ Registrado! [tipo] de R$[valor] em [categoria]. Saldo do mês: R$[saldo]"
  - Se número não vinculado: "❌ Número não vinculado. Acesse financas-ai-ivory.vercel.app para conectar."
- **src/components/WhatsAppConnect.tsx**: Campo número (+5511999999999), botão "Conectar WhatsApp", status conectado/desconectado, lista de comandos, instrução para enviar "ajuda".

---

## 2. O que ficou pendente

- **Domínio Resend**: usar `onboarding@resend.dev` (sandbox) até verificar domínio próprio.
- **Número do bot**: o usuário precisa configurar o número da instância Z-API e informá-lo na tela de Perfil (atualmente genérico).
- **Testes E2E**: validação completa do fluxo de email e WhatsApp em produção.

---

## 3. Checklist manual

- [ ] Criar conta em [resend.com](https://resend.com)
- [ ] Verificar domínio ou usar sandbox (`onboarding@resend.dev`)
- [ ] Gerar `RESEND_API_KEY` em Resend > API Keys
- [ ] `npx supabase functions deploy send-email`
- [ ] `npx supabase secrets set RESEND_API_KEY=sua_chave`
- [ ] Criar conta em [z-api.io](https://z-api.io)
- [ ] Criar instância e conectar número WhatsApp
- [ ] `npx supabase functions deploy whatsapp-webhook`
- [ ] `npx supabase secrets set VITE_ZAPI_INSTANCE_ID=...`
- [ ] `npx supabase secrets set VITE_ZAPI_TOKEN=...`
- [ ] Configurar webhook Z-API apontando para:
  ```
  https://yjhrwcqrlkyliycokiyg.supabase.co/functions/v1/whatsapp-webhook
  ```
- [ ] Executar migration `docs/supabase-migration-v2.sql` (coluna `preferences`)

---

## 4. Comandos de deploy

```bash
# Resend
npx supabase functions deploy send-email
npx supabase secrets set RESEND_API_KEY=sua_chave_resend

# Z-API
npx supabase functions deploy whatsapp-webhook
npx supabase secrets set VITE_ZAPI_INSTANCE_ID=seu_instance_id
npx supabase secrets set VITE_ZAPI_TOKEN=seu_token

# Gemini (para WhatsApp processar mensagens ambíguas)
npx supabase secrets set GEMINI_API_KEY=sua_chave_gemini
# ou use VITE_GEMINI_API_KEY se já configurada
```

---

## 5. Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `src/lib/email.ts` | Reescrito |
| `supabase/functions/send-email/index.ts` | Reescrito |
| `src/hooks/useAlerts.ts` | Reescrito + `checkAndSendAlerts` |
| `src/components/AppLayout.tsx` | + `checkAndSendAlerts` no login |
| `src/pages/ProfilePage.tsx` | + toggles Notificações por e-mail |
| `src/types/database.ts` | + `preferences` em Profile |
| `docs/supabase-migration-v2.sql` | + coluna `preferences` |
| `src/lib/zapi.ts` | Atualizado |
| `supabase/functions/whatsapp-webhook/index.ts` | Reescrito com processor |
| `src/components/WhatsAppConnect.tsx` | Reescrito |
| `docs/RESEND-ZAPI-RELATORIO.md` | Criado |
