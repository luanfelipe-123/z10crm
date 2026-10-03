'use client';

/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageCircle, Plus, Power, QrCode, RefreshCw, Search, Settings2, Trash2, Wifi } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { SaveNotice, SettingsPageHeader, SettingsPanel, settingsInputClass } from '@/components/settings/SettingsUI';
import { supabase } from '@/lib/supabase';

type Connection = {
  id: string;
  name: string;
  provider: string;
  instance_name: string;
  status: string;
  enabled: boolean;
  phone: string | null;
  created_at: string;
};

export default function ConnectionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [name, setName] = useState('WhatsApp Comercial');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrConnection, setQrConnection] = useState<Connection | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function api(body?: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch('/api/evolution', {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${session.access_token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Falha na conexão com o servidor.');
    return result;
  }

  async function load() {
    try {
      const result = await api();
      setConfigured(Boolean(result.configured));
      setConnections(result.connections ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erro ao carregar conexões.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // load reads the current authenticated session and is intentionally called once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? connections.filter((connection) => `${connection.name} ${connection.provider}`.toLowerCase().includes(query)) : connections;
  }, [connections, search]);

  async function createConnection(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await api({ action: 'create', name: name.trim() });
      setConnections((current) => [result.connection, ...current]);
      setQrConnection(result.connection);
      setQrCode(result.qrCode ?? null);
      setPairingCode(result.pairingCode ?? null);
      setCreateOpen(false); setQrOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar a conexão.');
    } finally {
      setSaving(false);
    }
  }

  async function refreshConnection(connection: Connection, showModal = true) {
    setSaving(true); setError('');
    try {
      const result = await api({ action: 'refresh', id: connection.id });
      setConnections((current) => current.map((item) => item.id === connection.id ? { ...item, status: result.status } : item));
      if (result.status === 'open') {
        setQrOpen(false); setQrCode(null); setPairingCode(null); setQrConnection(null);
        setMessage('WhatsApp conectado com sucesso.');
      } else if (showModal) {
        setQrConnection(connection); setQrCode(result.qrCode ?? null); setPairingCode(result.pairingCode ?? null); setQrOpen(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a conexão.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleConnection(connection: Connection) {
    try {
      const result = await api({ action: 'toggle', id: connection.id, enabled: !connection.enabled });
      setConnections((current) => current.map((item) => item.id === connection.id ? result.connection : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Erro ao alterar conexão.'); }
  }

  async function logoutConnection(connection: Connection) {
    if (!window.confirm(`Desconectar o WhatsApp de "${connection.name}"?`)) return;
    try { await api({ action: 'logout', id: connection.id }); await refreshConnection(connection, false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Erro ao desconectar.'); }
  }

  async function deleteConnection(connection: Connection) {
    if (!window.confirm(`Excluir definitivamente a conexão "${connection.name}"?`)) return;
    try { await api({ action: 'delete', id: connection.id }); setConnections((current) => current.filter((item) => item.id !== connection.id)); setMessage('Conexão excluída.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Erro ao excluir.'); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 animate-spin" size={20} /> Carregando conexões...</div>;

  return (
    <div>
      <SettingsPageHeader title="Conexões" description="Gerencie suas conexões de comunicação." action={<button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-md bg-sky-300 px-4 py-2.5 text-sm font-semibold text-zinc-950"><Plus size={16} /> Criar</button>} />
      <SaveNotice message={message} error={error} />

      {!configured && <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"><div className="font-semibold">Evolution API ainda não configurada</div><p className="mt-1 text-amber-100/70">Adicione EVOLUTION_API_URL, EVOLUTION_API_KEY, SUPABASE_SECRET_KEY, APP_URL e EVOLUTION_WEBHOOK_SECRET na Vercel e na VPS.</p></div>}

      <div className="mb-4 flex items-center gap-3"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar..." className="w-full rounded-md border border-white/20 bg-[#1d1e1c] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-300" /></div><span className="text-sm text-zinc-400">{filtered.length} resultados</span></div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((connection) => {
          const connected = connection.status === 'open';
          return <SettingsPanel key={connection.id} className="overflow-hidden"><div className="p-4"><div className="flex items-center justify-between text-xs"><span className={`flex items-center gap-1.5 font-semibold ${connected ? 'text-emerald-300' : 'text-amber-300'}`}><span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />{connected ? 'Conectado' : 'Aguardando conexão'}</span><span className="text-zinc-500">Evolution API</span></div><div className="mt-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><MessageCircle size={25} /></div><div><div className="font-bold">{connection.name}</div><div className="text-sm text-zinc-400">WhatsApp</div></div></div><p className="mt-4 text-xs leading-5 text-zinc-400">Conexão direta pelo seu servidor Evolution. Instância: {connection.instance_name}</p></div><div className="flex items-center gap-1 border-t border-white/10 px-3 py-2"><button onClick={() => refreshConnection(connection)} className="flex items-center gap-1.5 rounded-md px-2 py-2 text-xs text-zinc-300 hover:bg-white/5"><QrCode size={15} /> {connected ? 'Status' : 'QR Code'}</button><button onClick={() => logoutConnection(connection)} className="rounded-md p-2 text-zinc-400 hover:bg-white/5 hover:text-white" title="Desconectar"><Power size={15} /></button><button onClick={() => deleteConnection(connection)} className="rounded-md p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-300" title="Excluir"><Trash2 size={15} /></button><button onClick={() => toggleConnection(connection)} className={`ml-auto h-6 w-11 rounded-full p-1 transition ${connection.enabled ? 'bg-sky-300' : 'bg-zinc-600'}`} title="Ativar ou pausar"><span className={`block h-4 w-4 rounded-full bg-zinc-900 transition ${connection.enabled ? 'translate-x-5' : ''}`} /></button></div></SettingsPanel>;
        })}
      </div>
      {!filtered.length && <SettingsPanel className="p-12 text-center"><Wifi className="mx-auto text-zinc-600" size={34} /><h2 className="mt-3 font-semibold">Nenhuma conexão criada</h2><p className="mt-1 text-sm text-zinc-500">Crie uma instância Evolution e leia o QR Code com seu WhatsApp.</p></SettingsPanel>}

      <Modal open={createOpen} title="Conectar WhatsApp" onClose={() => setCreateOpen(false)} size="sm"><div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"><div className="flex items-center gap-3"><MessageCircle className="text-emerald-300" /><div><div className="font-semibold">Evolution API</div><div className="text-xs text-zinc-400">QR Code gerado dentro do Z10 CRM</div></div></div></div><form onSubmit={createConnection} className="space-y-4"><label className="block text-sm"><span className="mb-2 block font-medium">Nome da conexão</span><input value={name} onChange={(event) => setName(event.target.value)} className={settingsInputClass} placeholder="WhatsApp Comercial" /></label><button disabled={saving || !configured || !name.trim()} className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-300 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Criar e gerar QR Code</button></form></Modal>

      <Modal open={qrOpen} title="Conectar aparelho" onClose={() => setQrOpen(false)} size="sm"><div className="text-center"><p className="text-sm text-zinc-400">No WhatsApp, abra <strong className="text-white">Aparelhos conectados</strong>, toque em conectar aparelho e leia o código.</p>{qrCode ? <img src={qrCode} alt="QR Code do WhatsApp" className="mx-auto mt-5 h-72 w-72 rounded-xl bg-white p-3" /> : <div className="mx-auto mt-5 flex h-72 w-72 items-center justify-center rounded-xl border border-dashed border-white/15 text-zinc-500"><QrCode size={54} /></div>}{pairingCode && <div className="mt-4"><div className="text-xs text-zinc-500">Código de pareamento</div><div className="mt-1 font-mono text-2xl tracking-widest text-sky-300">{pairingCode}</div></div>}<button disabled={saving || !qrConnection} onClick={() => qrConnection && refreshConnection(qrConnection)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-sky-300 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} Já escaneei, verificar conexão</button><div className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-500"><Settings2 size={13} /> O QR Code pode expirar; use o botão para gerar outro.</div></div></Modal>
    </div>
  );
}
