import { runAutomation } from '@/lib/server/automation-runner';
import { createAdminClient } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const admin = createAdminClient();
    const { data: automation } = await admin.from('automations').select('id,tenant_id,name,action_type,action_config').eq('webhook_token', token).eq('trigger_type', 'incoming_webhook').eq('enabled', true).maybeSingle();
    if (!automation) return Response.json({ error: 'Webhook não encontrado ou inativo.' }, { status: 404 });
    const payload = await request.json().catch(() => ({}));
    const result = await runAutomation(admin, automation, payload, 'incoming_webhook');
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao executar webhook.';
    return Response.json({ error: message }, { status: 500 });
  }
}
