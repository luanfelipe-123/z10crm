import { requireRequestContext, requestError } from '../../../../lib/server/request-auth';
import { decryptText } from '../../../../lib/server/wa-crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { admin, tenantId } = await requireRequestContext(request);
    const { data, error } = await admin
      .from('wa_conversations')
      .select('id, connection_id, remote_jid, contact_name_enc, last_message_enc, last_message_at, unread_count, status, lead_id')
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const conversations = (data ?? []).map((c) => ({
      id: c.id,
      connectionId: c.connection_id,
      phone: String(c.remote_jid).split('@')[0],
      name: decryptText(c.contact_name_enc),
      lastMessage: decryptText(c.last_message_enc),
      lastMessageAt: c.last_message_at,
      unreadCount: c.unread_count,
      status: c.status,
      leadId: c.lead_id,
    }));
    return Response.json({ conversations });
  } catch (error) {
    return requestError(error);
  }
}
