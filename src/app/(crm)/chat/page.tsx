'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Conversation = {
  id: string;
  phone: string;
  name: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  leadId: string | null;
};

type Message = {
  id: string;
  fromMe: boolean;
  type: string;
  text: string | null;
  timestamp: string;
};

const TYPE_LABEL: Record<string, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
  sticker: 'Figurinha',
};

let client: SupabaseClient | null = null;
function getClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return client;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await getClient().auth.getSession();
  const token = data.session?.access_token ?? '';
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(json.error ?? 'Erro na requisição.');
  return json as T;
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    return `+55 (${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  }
  return phone;
}

const colors = {
  panel: '#0f0f11',
  panelAlt: '#18181b',
  border: 'rgba(255,255,255,0.08)',
  text: '#f4f4f5',
  muted: '#a1a1aa',
  accent: '#38bdf8',
  mine: '#2563eb',
  theirs: '#27272a',
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api<{ conversations: Conversation[] }>('/api/chat/conversations');
      setConversations(data.conversations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar conversas.');
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const data = await api<{ messages: Message[] }>(`/api/chat/messages?conversationId=${id}`);
      setMessages(data.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar mensagens.');
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const timer = setInterval(() => void loadConversations(), 4000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    void loadMessages(selectedId);
    const timer = setInterval(() => void loadMessages(selectedId), 3000);
    return () => clearInterval(timer);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, selectedId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (c) => c.phone.includes(term) || (c.name ?? '').toLowerCase().includes(term),
    );
  }, [conversations, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  async function send() {
    const value = text.trim();
    if (!value || !selectedId || sending) return;
    setSending(true);
    try {
      await api('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedId, text: value }),
      });
      setText('');
      await loadMessages(selectedId);
      void loadConversations();
    } catch (e) {
      setError(e instanceof Error ?
cd /opt/z10-crm
cp "src/app/(crm)/chat/page.tsx" /tmp/chat-page.backup.tsx

cat > "src/app/(crm)/chat/page.tsx" <<'EOF'
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Conversation = {
  id: string;
  phone: string;
  name: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  leadId: string | null;
};

type Message = {
  id: string;
  fromMe: boolean;
  type: string;
  text: string | null;
  timestamp: string;
};

const TYPE_LABEL: Record<string, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
  sticker: 'Figurinha',
};

let client: SupabaseClient | null = null;
function getClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return client;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await getClient().auth.getSession();
  const token = data.session?.access_token ?? '';
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(json.error ?? 'Erro na requisição.');
  return json as T;
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    return `+55 (${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  }
  return phone;
}

const colors = {
  panel: '#0f0f11',
  panelAlt: '#18181b',
  border: 'rgba(255,255,255,0.08)',
  text: '#f4f4f5',
  muted: '#a1a1aa',
  accent: '#38bdf8',
  mine: '#2563eb',
  theirs: '#27272a',
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api<{ conversations: Conversation[] }>('/api/chat/conversations');
      setConversations(data.conversations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar conversas.');
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const data = await api<{ messages: Message[] }>(`/api/chat/messages?conversationId=${id}`);
      setMessages(data.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar mensagens.');
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const timer = setInterval(() => void loadConversations(), 4000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    void loadMessages(selectedId);
    const timer = setInterval(() => void loadMessages(selectedId), 3000);
    return () => clearInterval(timer);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, selectedId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (c) => c.phone.includes(term) || (c.name ?? '').toLowerCase().includes(term),
    );
  }, [conversations, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  async function send() {
    const value = text.trim();
    if (!value || !selectedId || sending) return;
    setSending(true);
    try {
      await api('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedId, text: value }),
      });
      setText('');
      await loadMessages(selectedId);
      void loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ color: colors.text }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 16px' }}>Chat ao vivo</h1>
      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 14 }}>
          {error}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '340px minmax(0, 1fr) 300px',
          height: 'calc(100vh - 170px)',
          minHeight: 420,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          background: colors.panel,
        }}
      >
        <aside style={{ borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquise seus contatos"
              style={{ width: '100%', boxSizing: 'border-box', background: colors.panelAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '10px 12px', outline: 'none' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loaded && filtered.length === 0 && (
              <p style={{ color: colors.muted, padding: 16, fontSize: 14 }}>
                Nenhuma conversa ainda. Quando alguém enviar mensagem para o WhatsApp conectado, ela aparece aqui.
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setMessages([]);
                  setSelectedId(c.id);
                }}
                style={{
                  display: 'flex',
                  gap: 12,
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: c.id === selectedId ? colors.panelAlt : 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.text,
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 20, background: '#3f3f46', display: 'grid', placeItems: 'center', fontWeight: 600, flexShrink: 0 }}>
                  {(c.name ?? c.phone).charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name ?? formatPhone(c.phone)}
                    </strong>
                    <span style={{ color: colors.muted, fontSize: 12, flexShrink: 0 }}>{formatTime(c.lastMessageAt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                    <span style={{ color: colors.muted, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.lastMessage ?? ''}
                    </span>
                    {c.unreadCount > 0 && (
                      <span style={{ background: colors.accent, color: '#082f49', borderRadius: 10, fontSize: 12, fontWeight: 700, padding: '0 7px', flexShrink: 0 }}>
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: colors.muted }}>
              Selecione uma conversa para começar.
            </div>
          ) : (
            <>
              <header style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
                <strong>{selected.name ?? formatPhone(selected.phone)}</strong>
                <div style={{ color: colors.muted, fontSize: 12 }}>{formatPhone(selected.phone)}</div>
              </header>
              <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '70%', background: m.fromMe ? colors.mine : colors.theirs, borderRadius: 12, padding: '8px 12px', fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.text ?? `[${TYPE_LABEL[m.type] ?? 'Mensagem'}]`}
                      <div style={{ textAlign: 'right', fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                        {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <footer style={{ padding: 12, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8 }}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Mensagem..."
                  style={{ flex: 1, background: colors.panelAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '10px 16px', outline: 'none' }}
                />
                <button
                  onClick={() => void send()}
                  disabled={sending || !text.trim()}
                  style={{ background: colors.mine, color: '#fff', border: 'none', borderRadius: 20, padding: '0 20px', cursor: 'pointer', opacity: sending || !text.trim() ? 0.5 : 1 }}
                >
                  Enviar
                </button>
              </footer>
            </>
          )}
        </section>

        <aside style={{ borderLeft: `1px solid ${colors.border}`, padding: 18, overflowY: 'auto' }}>
          {selected ? (
            <>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Contato</h3>
              <div style={{ color: colors.muted, fontSize: 12 }}>Nome</div>
              <div style={{ marginBottom: 10 }}>{selected.name ?? '—'}</div>
              <div style={{ color: colors.muted, fontSize: 12 }}>Telefone</div>
              <div style={{ marginBottom: 16 }}>{formatPhone(selected.phone)}</div>
              <div style={{ background: colors.panelAlt, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14, fontSize: 13, color: colors.muted }}>
                {selected.leadId ? 'Lead vinculado.' : 'Lead não encontrado. A vinculação com a base de leads vem na próxima etapa.'}
              </div>
            </>
          ) : (
            <p style={{ color: colors.muted, fontSize: 14 }}>Os dados do contato aparecem aqui.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
