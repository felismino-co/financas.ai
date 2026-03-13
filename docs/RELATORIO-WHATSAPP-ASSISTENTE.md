# Relatório — Assistente Financeiro WhatsApp

## 1. Implementado

### Tarefa 1 — Notificações proativas
- **Arquivo:** `supabase/functions/whatsapp-notifications/index.ts`
- Notificações de contas (bills): 7 dias, 3 dias, 1 dia, no dia
- Notificações a receber (receivables): 7 dias, 3 dias, no dia
- Resumo semanal (segunda 8h) com metas e dica via Gemini
- Lembrete diário noturno (21h) opcional

### Tarefa 2 — Comandos do assistente
- **Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`
- **Registro:** `gastei X em Y`, `recebi X salário`, `paguei [nome]`, `recebi [descrição]`
- **Consulta:** `saldo`, `contas`, `a receber`, `resumo`, `metas`, `ajuda`, `dica`
- Barra de progresso em metas: `██████░░░░ 60%`

### Tarefa 3 — Gemini para mensagens livres
- Mensagens que não encaixam em padrões usam Gemini com contexto do usuário
- Se parecer transação, extrai `{ type, amount, category, description }` e salva

### Tarefa 4 — Cron job
- **Arquivo:** `supabase/functions/whatsapp-cron/index.ts`
- Delega para `whatsapp-notifications` via HTTP
- `?mode=8h` → contas, recebimentos, resumo semanal
- `?mode=21h` → lembrete diário noturno

### Tarefa 5 — Preferências no perfil
- **Arquivo:** `src/components/WhatsAppConnect.tsx`
- Toggles após conectar: 7 dias, 3 dias, dia do vencimento, recebimentos, resumo semanal, lembrete 21h, dica semanal

### Tarefa 6 — sendWhatsApp robusta
- **Arquivo:** `src/lib/zapi.ts` (já existente)
- Formatação de número, retry 3x, rate limiting

### Tarefa 7 — SQL migration
- **Arquivo:** `docs/supabase-migration-whatsapp.sql`
- Tabela `notification_log`, coluna `whatsapp_preferences` em `profiles`

---

## 2. Pendente (requer configuração)

- **Z-API:** `ZAPI_INSTANCE_ID` e `ZAPI_TOKEN` nos secrets do Supabase
- **Webhook Z-API:** apontar para `https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-webhook`
- **pg_cron:** configurar jobs externos ou via Supabase (ver seção 4)

---

## 3. SQL para executar

```bash
# No SQL Editor do Supabase, execute:
# docs/supabase-migration-whatsapp.sql
```

---

## 4. Checklist de deploy

- [ ] Executar `docs/supabase-migration-whatsapp.sql`
- [ ] Deploy: `npx supabase functions deploy whatsapp-notifications`
- [ ] Deploy: `npx supabase functions deploy whatsapp-cron`
- [ ] Deploy: `npx supabase functions deploy whatsapp-webhook`
- [ ] Adicionar secrets: `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `GEMINI_API_KEY`
- [ ] Configurar webhook na Z-API → URL do whatsapp-webhook
- [ ] Configurar cron externo (ex: cron-job.org) para chamar:
  - 8h: `POST https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-cron?mode=8h` com header `Authorization: Bearer SERVICE_ROLE_KEY`
  - 21h: `POST https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-cron?mode=21h` com header `Authorization: Bearer SERVICE_ROLE_KEY`

---

## 5. Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/whatsapp-notifications/index.ts` | Criado |
| `supabase/functions/whatsapp-cron/index.ts` | Criado |
| `supabase/functions/whatsapp-webhook/index.ts` | Atualizado |
| `src/components/WhatsAppConnect.tsx` | Atualizado |
| `docs/supabase-migration-whatsapp.sql` | Atualizado |
| `docs/RELATORIO-WHATSAPP-ASSISTENTE.md` | Criado |

---

## 6. Commit message

```
feat(whatsapp): assistente financeiro completo via WhatsApp

- Notificações proativas: contas, recebimentos, resumo semanal, lembrete 21h
- Comandos: gastei, recebi, paguei, saldo, contas, metas, dica, ajuda
- Gemini para mensagens livres e extração de transações
- Preferências de notificação no perfil (WhatsAppConnect)
- Cron whatsapp-cron delegando para whatsapp-notifications
- Migration notification_log e whatsapp_preferences
```
