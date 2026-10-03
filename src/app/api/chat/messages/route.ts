import { requireRequestContext, requestError } from '../../../../lib/server/request-auth';
import { decryptText } from '../../../../lib/server/wa-crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { admin, tenantId } = await requireRequestContext(request);
    const conversationId = new URL(request.url).searchParams.get('conversationId');
    if (!conversationId) return Response.json({ error: 'conversationId é obrigatório.' }, { status: 400 });

    const { data: conversation } = await admin
      .from('wa_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!conversation) return Response.json({ error: 'Conversa não encontrada.' }, { status: 404 });

    const { data, error } = await admin
      .from('wa_messages')
      .select('id, external_id, from_me, type, body_enc, status, message_timestamp')
      .eq('conversation_id', conversationId)
      .order('message_timestamp', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    await admin.from('wa_conversations').update({ unread_count: 0 }).eq('id', conversationId);

    const messages = (data ?? []).reverse().map((m) => ({
      id: m.id,
      fromMe: m.from_me,
      type: m.type,
      text: decryptText(m.body_enc),
      status: m.status,
      timestamp: m.message_timestamp,
    }));
    return Response.json({ messages });
  } catch (error) {
    return requestError(error);
  }
}
