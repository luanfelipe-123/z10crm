import { evolutionIsConfigured, evolutionRequest, qrDataUrl } from '@/lib/server/evolution';
import { requestError, requireRequestContext } from '@/lib/server/request-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'whatsapp';
}

async function getConnection(admin: Awaited<ReturnType<typeof requireRequestContext>>['admin'], tenantId: string, id: string) {
  const { data } = await admin.from('connections').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle();
  if (!data) throw new Error('Conexão não encontrada.');
  return data;
}

export async function GET(request: Request) {
  try {
    const { admin, tenantId } = await requireRequestContext(request);
    const { data, error } = await admin.from('connections').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (error) throw error;
    return Response.json({ configured: evolutionIsConfigured(), connections: data ?? [] });
  } catch (error) {
    return requestError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { admin, tenantId, user } = await requireRequestContext(request);
    const body = await request.json() as { action?: string; id?: string; name?: string; enabled?: boolean };

    if (body.action === 'create') {
      if (!evolutionIsConfigured()) throw new Error('Configure EVOLUTION_API_URL e EVOLUTION_API_KEY antes de criar a conexão.');
      const displayName = body.name?.trim() || 'WhatsApp';
      const instanceName = `z10-${tenantId.slice(0, 8)}-${cleanName(displayName)}-${crypto.randomUUID().slice(0, 6)}`;
      const appUrl = process.env.APP_URL?.replace(/\/$/, '');
      const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
      const webhookUrl = appUrl && webhookSecret ? `${appUrl}/api/evolution/webhook?secret=${encodeURIComponent(webhookSecret)}` : undefined;

      const created = await evolutionRequest('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
          instanceName,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          groupsIgnore: true,
          alwaysOnline: true,
          readMessages: false,
          ...(webhookUrl ? {
            webhook: {
              url: webhookUrl,
              byEvents: false,
              base64: false,
              events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
            },
          } : {}),
        }),
      });

      const instance = (created.instance ?? {}) as Record<string, unknown>;
      const { data: connection, error: insertError } = await admin.from('connections').insert({
        tenant_id: tenantId,
        provider: 'evolution',
        name: displayName,
        instance_name: instanceName,
        status: typeof instance.status === 'string' ? instance.status : 'created',
        enabled: true,
        created_by: user.id,
        metadata: { evolution_instance_id: instance.instanceId ?? null },
      }).select('*').single();
      if (insertError) throw insertError;

      let connect = created;
      try { connect = await evolutionRequest(`/instance/connect/${encodeURIComponent(instanceName)}`); } catch { /* a criação pode já trazer o QR */ }
      return Response.json({ connection, qrCode: await qrDataUrl(connect), pairingCode: connect.pairingCode ?? null });
    }

    if (!body.id) throw new Error('Conexão não informada.');
    const connection = await getConnection(admin, tenantId, body.id);

    if (body.action === 'refresh') {
      const statePayload = await evolutionRequest(`/instance/connectionState/${encodeURIComponent(connection.instance_name)}`);
      const instance = (statePayload.instance ?? {}) as Record<string, unknown>;
      const state = typeof instance.state === 'string' ? instance.state : 'unknown';
      await admin.from('connections').update({ status: state, updated_at: new Date().toISOString() }).eq('id', connection.id);
      let qrCode: string | null = null;
      let pairingCode: unknown = null;
      if (state !== 'open') {
        const connect = await evolutionRequest(`/instance/connect/${encodeURIComponent(connection.instance_name)}`);
        qrCode = await qrDataUrl(connect);
        pairingCode = connect.pairingCode ?? null;
      }
      return Response.json({ status: state, qrCode, pairingCode });
    }

    if (body.action === 'toggle') {
      const { data, error } = await admin.from('connections').update({ enabled: Boolean(body.enabled), updated_at: new Date().toISOString() }).eq('id', connection.id).select('*').single();
      if (error) throw error;
      return Response.json({ connection: data });
    }

    if (body.action === 'logout') {
      await evolutionRequest(`/instance/logout/${encodeURIComponent(connection.instance_name)}`, { method: 'DELETE' });
      await admin.from('connections').update({ status: 'close', updated_at: new Date().toISOString() }).eq('id', connection.id);
      return Response.json({ ok: true });
    }

    if (body.action === 'delete') {
      try { await evolutionRequest(`/instance/delete/${encodeURIComponent(connection.instance_name)}`, { method: 'DELETE' }); } catch { /* remove o registro local mesmo se a instância externa já não existir */ }
      const { error } = await admin.from('connections').delete().eq('id', connection.id).eq('tenant_id', tenantId);
      if (error) throw error;
      return Response.json({ ok: true });
    }

    throw new Error('Ação inválida.');
  } catch (error) {
    return requestError(error);
  }
}
