import { requireRequestContext, requestError } from '../../../../lib/server/request-auth';
import { evolutionRequest } from '../../../../lib/server/evolution';
import { storeMessage } from '../../../../lib/server/whatsapp-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { admin, tenantId } = await requireRequestContext(request);
    const body = (await request.json().catch(() => ({}))) as { conversationId?: string; text?: string };
    const text = body.text?.trim();
    if (!body.conversationId || !text) {
      return Response.json({ error: 'Informe a conversa e o texto.' }, { status: 400 });
    }

    const { data: conversation } = await admin
      .from('wa_conversations')
      .select('id, connection_id, remote_jid')
      .eq('id', body.conversationId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!conversation) return Response.json({ error: 'Conversa não encontrada.' }, { status: 404 });

    const { data: connection } = await admin
      .from('connections')
      .select('instance_name')
      .eq('id', conversation.connection_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!connection?.instance_name) {
      return Response.json({ error: 'Conexão de WhatsApp não encontrada.' }, { status: 404 });
    }

    const jid = String(conversation.remote_jid);
    const number = jid.endsWith('@s.whatsapp.net') ? jid.split('@')[0] : jid;

    const result = await evolutionRequest(`/message/sendText/${encodeURIComponent(connection.instance_name)}`, {
      method: 'POST',
      body: JSON.stringify({ number, text }),
    });
    const key = (result.key ?? {}) as { id?: string };

    await storeMessage(admin, {
      tenantId,
      connectionId: conversation.connection_id,
      remoteJid: jid,
      externalId: key.id ?? `local-${crypto.randomUUID()}`,
      fromMe: true,
      type: 'text',
      text,
      timestamp: new Date(),
    });
    return Response.json({ ok: true });
  } catch (error) {
    return requestError(error);
  }
}
