# Configuração Z-API (WhatsApp)

1. Crie uma conta em [z-api.io](https://z-api.io)
2. Crie uma instância e conecte seu WhatsApp
3. Copie o **Instance ID** e o **Token**
4. **Supabase Edge Functions** – adicione os secrets:
   - `VITE_ZAPI_INSTANCE_ID`
   - `VITE_ZAPI_TOKEN`
5. Configure o webhook na Z-API apontando para:
   ```
   https://<seu-projeto>.supabase.co/functions/v1/whatsapp-webhook
   ```
6. Deploy:
   ```bash
   supabase functions deploy whatsapp-webhook
   ```

## Fluxo de vinculação

1. Usuário informa o telefone no Perfil
2. Envia &quot;conectar&quot; para o número do FinanceIA no WhatsApp
3. O webhook recebe, identifica o perfil pelo `phone_number` e marca `whatsapp_connected = true`
