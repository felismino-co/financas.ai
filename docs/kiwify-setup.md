# Configuração Kiwify (Webhook de Pagamentos)

## 1. Onde pegar o Webhook Secret na Kiwify

1. Acesse o [Painel Kiwify](https://app.kiwify.com.br)
2. Vá em **Configurações** → **Webhooks**
3. Crie um novo webhook ou edite um existente
4. O **Token** (ou Webhook Secret) aparece na configuração do webhook
5. Copie e guarde em local seguro — você usará como `KIWIFY_WEBHOOK_SECRET`

## 2. URL do Webhook

Configure na Kiwify a seguinte URL:

```
https://[SEU-PROJETO].supabase.co/functions/v1/kiwify-webhook
```

Exemplo: `https://yjhrwcqrlkyliycokiyg.supabase.co/functions/v1/kiwify-webhook`

## 3. Eventos a habilitar na Kiwify

Habilite os seguintes triggers no webhook:

| Evento Kiwify | Descrição |
|---------------|-----------|
| `compra_aprovada` | Pagamento aprovado (plano único) |
| `compra_reembolsada` | Reembolso |
| `subscription_renewed` | Renovação de assinatura |
| `subscription_canceled` | Assinatura cancelada |

## 4. Variáveis de ambiente (Supabase Edge Functions)

No Supabase: **Settings** → **Edge Functions** → **Secrets**, adicione:

- `KIWIFY_WEBHOOK_SECRET` — Token do webhook da Kiwify

## 5. Deploy da função

```bash
supabase functions deploy kiwify-webhook
```

## 6. Como testar com o simulador da Kiwify

1. No painel Kiwify, vá em **Webhooks** → seu webhook
2. Use a opção **Testar** ou **Simular evento**
3. Envie um payload de teste com `compra_aprovada` e email de um usuário existente
4. Verifique no Supabase (tabela `profiles`) se `plan_type` foi atualizado para `pro`

## 7. Mapeamento de planos

O webhook identifica o plano pelo `product.id` da Kiwify:

- **Mensal** (31 dias): produto com link `/VUJcmP0`
- **Semestral** (183 dias): produto com link `/uzUMxK5`
- **Anual** (366 dias): produto com link `/y8zncPg`

Se não identificar, assume 31 dias.
