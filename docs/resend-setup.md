# Configuração Resend (Email)

1. Crie uma conta em [resend.com](https://resend.com)
2. Domínio: adicione e verifique seu domínio em **Domains**
3. API Key: em **API Keys** crie uma chave e copie
4. **Supabase Edge Function**: envie a variável `RESEND_API_KEY` no projeto:
   - Settings > Edge Functions > Secrets
   - Adicione: `RESEND_API_KEY` = sua chave
5. Deploy da função `send-email`:
   ```bash
   supabase functions deploy send-email
   ```

## Variáveis de ambiente

- `RESEND_API_KEY` – obrigatória no Supabase Edge Functions
- `VITE_RESEND_API_KEY` – não é necessária no frontend (o envio é feito via Edge Function)
