import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptText } from './wa-crypto';

type Obj = Record<string, unknown>;
type Connection = { id: string; tenant_id: string };

const MESSAGE_EVENTS = new Set(['messages.upsert', 'send.message']);

function normalizeEvent(name: string) {
  return name.toLowerCase().replace(/_/g, '.');
}

export function isMessageEvent(eventName: string) {
  return MESSAGE_EVENTS.has(normalizeEvent(eventName));
}

function asObj(value: unknown): Obj {
  return value && typeof value === 'object' ? (value as Obj) : {};
}

export function extractContent(message: unknown): { type: string; text: string | null } {
  const m = asObj(message);
  if (typeof m.conversation === 'string') return { type: 'text', text: m.conversation };
  const ext = asObj(m.extendedTextMessage);
  if (typeof ext.text === 'string') return { type: 'text', text: ext.text };
  if (m.imageMessage) {
    const caption = asObj(m.imageMessage).caption;
    return { type: 'image', text: typeof caption === 'string' ? caption : null };
  }
  if (m.audioMessage) return { type: 'audio', text: null };
  if (m.videoMessage) {
    const caption = asObj(m.videoMessage).caption;
    return { type: 'video', text: typeof caption === 'string' ? caption : null };
  }
  if (m.documentMessage) {
    const name = asObj(m.documentMessage).fileName;
    return { type: 'document', text: typeof name === 'string' ? name : null };
  }
  if (m.stickerMessage) return { type: 'sticker', text: null };
  return { type: 'other', text: null };
}

export function previewLabel(type: string, text: string | null) {
  if (text) return text;
  const labels: Record<string, string> = {
    image: 'Imagem',
    audio: 'Áudio',
    video: 'Vídeo',
    document: 'Documento',
    sticker: 'Figurinha',
  };
  return labels[type] ?? 'Mensagem';
}

function toDate(value: unknown): Date {
  let n = NaN;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string') n = Number(value);
  else if (value && typeof value === 'object') n = Number((value as Obj).low);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  if (n < 1e12) n *= 1000;
  return new Date(n);
}

export type StoreInput = {
  tenantId: string;
  connectionId: string;
  remoteJid: string;
  externalId: string;
  fromMe: boolean;
  type: string;
  text: string | null;
  timestamp: Date;
  pushName?: string | null;
};

export async function storeMessage(admin: SupabaseClient, input: StoreInput) {
  const { data: existing } = await admin
    .from('wa_conversations')
    .select('id, unread_count, last_message_at')
    .eq('connection_id', input.connectionId)
    .eq('remote_jid', input.remoteJid)
    .maybeSingle();

  let conversationId: string | undefined = existing?.id;
  if (!conversationId) {
    const { data: created, error } = await admin
      .from('wa_conversations')
      .insert({
        tenant_id: input.tenantId,
        connection_id: input.connectionId,
        remote_jid: input.remoteJid,
      })
      .select('id')
      .single();
    if (error) {
      const { data: again } = await admin
        .from('wa_conversations')
        .select('id')
        .eq('connection_id', input.connectionId)
        .eq('remote_jid', input.remoteJid)
        .maybeSingle();
      conversationId = again?.id;
      if (!conversationId) throw new Error(error.message);
    } else {
      conversationId = created.id;
    }
  }

  const { data: inserted, error: messageError } = await admin
    .from('wa_messages')
    .upsert(
      {
        tenant_id: input.tenantId,
        conversation_id: conversationId,
        connection_id: input.connectionId,
        external_id: input.externalId,
        from_me: input.fromMe,
        type: input.type,
        body_enc: input.text ? encryptText(input.text) : null,
        message_timestamp: input.timestamp.toISOString(),
      },
      { onConflict: 'connection_id,external_id', ignoreDuplicates: true },
    )
    .select('id');
  if (messageError) throw new Error(messageError.message);
  if (!inserted || inserted.length === 0) return { conversationId, duplicate: true };

  const lastAt = existing?.last_message_at ? new Date(existing.last_message_at) : null;
  const isNewest = !lastAt || input.timestamp >= lastAt;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (isNewest) {
    update.last_message_enc = encryptText(previewLabel(input.type, input.text));
    update.last_message_at = input.timestamp.toISOString();
  }
  if (!input.fromMe) {
    update.unread_count = (existing?.unread_count ?? 0) + 1;
    if (input.pushName) update.contact_name_enc = encryptText(input.pushName);
  }
  await admin.from('wa_conversations').update(update).eq('id', conversationId);
  return { conversationId, duplicate: false };
}

export async function syncWhatsappMessages(
  admin: SupabaseClient,
  connection: Connection,
  eventName: string,
  payload: Obj,
) {
  if (!isMessageEvent(eventName)) return;
  const raw = payload.data;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];

  for (const item of items) {
    const data = asObj(item);
    const key = asObj(data.key);
    const remoteJid = typeof key.remoteJid === 'string' ? key.remoteJid : '';
    const externalId = typeof key.id === 'string' ? key.id : '';
    if (!remoteJid || !externalId) continue;
    if (remoteJid.endsWith('@g.us') || remoteJid.includes('broadcast')) continue;

    const { type, text } = extractContent(data.message);
    if (type === 'other') continue;

    await storeMessage(admin, {
      tenantId: connection.tenant_id,
      connectionId: connection.id,
      remoteJid,
      externalId,
      fromMe: key.fromMe === true,
      type,
      text,
      timestamp: toDate(data.messageTimestamp),
      pushName: typeof data.pushName === 'string' ? data.pushName : null,
    });
  }
}
