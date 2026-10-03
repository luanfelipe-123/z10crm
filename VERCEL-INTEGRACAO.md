# Integração do Z10 CRM

## Vercel
Configure estas variáveis no projeto `z10-crm`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`
- `APP_URL=https://z10-crm.vercel.app`

Nunca coloque os valores privados em arquivos enviados ao repositório.

## Autenticação
No painel do backend atual, mantenha estes endereços permitidos:
- Site URL: `https://z10-crm.vercel.app`
- Redirect URL: `https://z10-crm.vercel.app/auth/callback`

Para desenvolvimento local, também permita `http://localhost:3000/auth/callback`.

## VPS Hostinger
A VPS continua hospedando os serviços já usados pelo app. `EVOLUTION_API_URL` deve apontar para o endereço HTTPS público desse serviço. Libere CORS somente para `https://z10-crm.vercel.app` quando a integração exigir acesso pelo navegador.

## Banco
Este pacote não altera tabelas nem dados. Os arquivos SQL existentes foram preservados somente como referência das funcionalidades atuais.
