import { isMessageEvent, syncWhatsappMessages } from '../../../../lib/server/whatsapp-sync';
import { createAdminClient } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (!secret || secret !== process.env.EVOLUTION_WEBHOOK_SECRET) return Response.json({ error: 'Não autorizado.' }, { status: 401 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    const instanceName = String(payload.instance ?? (payload.data as Record<string, unknown> | undefined)?.instance ?? '');
    if (!instanceName) return Response.json({ ok: true });

    const admin = createAdminClient();
    const { data: connection } = await admin.from('connections').select('id,tenant_id').eq('instance_name', instanceName).maybeSingle();
    if (!connection) return Response.json({ ok: true });

    const eventName = String(payload.event ?? 'unknown');
    if (!isMessageEvent(eventName)) await admin.from('whatsapp_events').insert({
      tenant_id: connection.tenant_id,
      connection_id: connection.id,
      event_name: eventName,
      payload,
    });

    await syncWhatsappMessages(admin, connection, eventName, payload).catch((error) => console.error('wa-sync', error));

    if (eventName.toLowerCase().includes('connection')) {
      const data = (payload.data ?? {}) as Record<string, unknown>;
      const state = String(data.state ?? data.statusReason ?? 'unknown');
      await admin.from('connections').update({ status: state, updated_at: new Date().toISOString() }).eq('id', connection.id);
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook inválido.';
    return Response.json({ error: message }, { status: 400 });
  }
}
