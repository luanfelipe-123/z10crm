'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, BriefcaseBusiness, Check, Clock3, Copy, FileJson, Globe2, Loader2, MessageSquare, Play, Plus, Search, Settings2, Tags, Trash2, UserPlus, Webhook, Workflow, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';

type Group = { id: string; name: string };
type Automation = {
  id: string;
  tenant_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  enabled: boolean;
  webhook_token: string;
  created_at: string;
};

type TriggerOption = { id: string; title: string; description: string; icon: LucideIcon; category: string; available: boolean };
const triggers: TriggerOption[] = [
  { id: 'manual', title: 'Execução manual', description: 'Execute a automação quando quiser.', icon: Play, category: 'Leads', available: true },
  { id: 'lead_created', title: 'Lead criado', description: 'Dispara quando um lead é cadastrado.', icon: UserPlus, category: 'Leads', available: true },
  { id: 'deal_moved', title: 'Negócio movido', description: 'Dispara quando um negócio muda de etapa.', icon: BriefcaseBusiness, category: 'Negócios', available: true },
  { id: 'incoming_webhook', title: 'Requisição HTTP (Webhook)', description: 'Dispara ao receber uma chamada HTTP.', icon: Webhook, category: 'HTTP', available: true },
  { id: 'field_changed', title: 'Campo alterado', description: 'Gatilho preparado para a próxima fase.', icon: Tags, category: 'Campos', available: false },
  { id: 'scheduled', title: 'Execução agendada', description: 'Agendamentos serão liberados na próxima fase.', icon: Clock3, category: 'Sistema', available: false },
  { id: 'message_received', title: 'Mensagem recebida', description: 'Será conectado aos eventos do WhatsApp.', icon: MessageSquare, category: 'Mensagens', available: false },
];
const categories = ['Leads', 'Negócios', 'Mensagens', 'Campos', 'HTTP', 'Sistema'];

export default function AutomationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [userId, setUserId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [search, setSearch] = useState('');
  const [createStep, setCreateStep] = useState<'closed' | 'choice' | 'form'>('closed');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selected, setSelected] = useState<Automation | null>(null);
  const [category, setCategory] = useState('Leads');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [outboundUrl, setOutboundUrl] = useState('');
  const [outboundMethod, setOutboundMethod] = useState('POST');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    setUserId(user.id);
    const { data: membership } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (!membership) return setLoading(false);
    setTenantId(membership.tenant_id);
    const [{ data: groupRows }, { data: automationRows, error: loadError }] = await Promise.all([
      supabase.from('automation_groups').select('id,name').eq('tenant_id', membership.tenant_id).order('name'),
      supabase.from('automations').select('*').eq('tenant_id', membership.tenant_id).order('created_at', { ascending: false }),
    ]);
    setGroups(groupRows ?? []);
    setGroupId(groupRows?.[0]?.id ?? '');
    setAutomations((automationRows ?? []) as Automation[]);
    if (loadError) setError(loadError.message);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? automations.filter((automation) => `${automation.name} ${automation.description ?? ''}`.toLowerCase().includes(query)) : automations;
  }, [automations, search]);

  async function createGroup() {
    if (!newGroup.trim() || !tenantId) return;
    const { data, error: groupError } = await supabase.from('automation_groups').insert({ tenant_id: tenantId, name: newGroup.trim() }).select('id,name').single();
    if (groupError || !data) return setError(groupError?.message ?? 'Erro ao criar grupo.');
    setGroups((current) => [...current, data]); setGroupId(data.id); setNewGroup('');
  }

  async function createAutomation(event: FormEvent) {
    event.preventDefault();
    if (!tenantId || !name.trim()) return;
    setSaving(true); setError('');
    const { data, error: insertError } = await supabase.from('automations').insert({ tenant_id: tenantId, group_id: groupId || null, name: name.trim(), description: description.trim() || null, created_by: userId, trigger_type: 'manual', action_type: 'none' }).select('*').single();
    setSaving(false);
    if (insertError || !data) return setError(insertError?.message ?? 'Erro ao criar automação.');
    const automation = data as Automation;
    setAutomations((current) => [automation, ...current]); setSelected(automation); setName(''); setDescription(''); setCreateStep('closed'); setBuilderOpen(true);
  }

  function openBuilder(automation: Automation) {
    setSelected(automation);
    setOutboundUrl(String(automation.action_config?.url ?? ''));
    setOutboundMethod(String(automation.action_config?.method ?? 'POST'));
    const found = triggers.find((item) => item.id === automation.trigger_type);
    setCategory(found?.category ?? 'Leads');
    setBuilderOpen(true); setMessage(''); setError('');
  }

  async function updateAutomation(changes: Partial<Automation>) {
    if (!selected) return;
    setSaving(true); setError('');
    const { data, error: updateError } = await supabase.from('automations').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', selected.id).select('*').single();
    setSaving(false);
    if (updateError || !data) { setError(updateError?.message ?? 'Erro ao salvar automação.'); return null; }
    const next = data as Automation;
    setSelected(next); setAutomations((current) => current.map((item) => item.id === next.id ? next : item)); setMessage('Automação salva.');
    return next;
  }

  async function chooseTrigger(trigger: TriggerOption) {
    if (!trigger.available) return;
    await updateAutomation({ trigger_type: trigger.id, trigger_config: {} });
  }

  async function saveAction() {
    if (!selected) return;
    if (!outboundUrl.trim()) return setError('Informe a URL HTTPS que receberá os dados.');
    await updateAutomation({ action_type: 'outbound_webhook', action_config: { url: outboundUrl.trim(), method: outboundMethod } });
  }

  async function toggleAutomation(automation: Automation) {
    const { data, error: updateError } = await supabase.from('automations').update({ enabled: !automation.enabled, updated_at: new Date().toISOString() }).eq('id', automation.id).select('*').single();
    if (updateError || !data) return setError(updateError?.message ?? 'Erro ao alterar automação.');
    const next = data as Automation;
    setAutomations((current) => current.map((item) => item.id === next.id ? next : item));
    if (selected?.id === next.id) setSelected(next);
  }

  async function deleteAutomation(automation: Automation) {
    if (!window.confirm(`Excluir a automação "${automation.name}"?`)) return;
    const { error: deleteError } = await supabase.from('automations').delete().eq('id', automation.id);
    if (deleteError) return setError(deleteError.message);
    setAutomations((current) => current.filter((item) => item.id !== automation.id)); setBuilderOpen(false); setSelected(null);
  }

  async function runManual(automation: Automation) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return setError('Sua sessão expirou.');
    setSaving(true);
    const response = await fetch('/api/automations/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ event: automation.trigger_type, automationId: automation.id, payload: { source: 'manual-test', timestamp: new Date().toISOString() } }) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error ?? 'Falha na execução.');
    setMessage(`${result.succeeded} automação(ões) executada(s).`);
  }

  function webhookUrl(automation: Automation) {
    if (typeof window === 'undefined') return `/api/webhooks/automations/${automation.webhook_token}`;
    return `${window.location.origin}/api/webhooks/automations/${automation.webhook_token}`;
  }

  async function copyWebhook(automation: Automation) {
    await navigator.clipboard.writeText(webhookUrl(automation)); setMessage('URL do webhook copiada.');
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 animate-spin" size={20} /> Carregando automações...</div>;

  return (
    <div className="-m-8 flex min-h-screen bg-[#252724]">
      <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-[#1f211f] p-3 lg:block"><div className="px-3 py-4 text-lg font-bold">Automações</div><button onClick={() => setCreateStep('choice')} className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-300 px-3 py-2.5 text-sm font-semibold text-zinc-950"><Plus size={16} /> Adicionar automação</button><div className="mt-5 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Grupos</div>{groups.map((group) => <div key={group.id} className="mt-2 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-white/5">{group.name}</div>)}</aside>

      <main className="min-w-0 flex-1 p-6 lg:p-9"><div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-[#222421] p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">Fluxo de automações</h1><p className="mt-1 text-sm text-zinc-400">Crie gatilhos e envie dados para seus webhooks.</p></div><div className="relative w-full max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar..." className="w-full rounded-md border border-white/20 bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-300" /></div></div>

        {(message || error) && <div className={`mt-5 flex items-center justify-between rounded-md border px-4 py-3 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{error || message}<button onClick={() => { setError(''); setMessage(''); }}><X size={16} /></button></div>}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><button onClick={() => setCreateStep('choice')} className="min-h-56 rounded-lg border border-white/15 bg-[#1e201e] p-5 text-left hover:border-sky-300/60"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300"><Workflow size={22} /></div><h2 className="mt-4 font-bold">Criar nova automação</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Comece do zero, escolha um gatilho e conecte uma ação.</p><div className="mt-5 flex items-center gap-2 text-sm font-semibold text-sky-300"><Plus size={16} /> Criar</div></button>{filtered.map((automation) => <article key={automation.id} className="flex min-h-56 flex-col rounded-lg border border-white/15 bg-[#1e201e] p-5"><div className="flex items-start justify-between"><div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${automation.enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-700 text-zinc-400'}`}>{automation.enabled ? 'Ativa' : 'Pausada'}</div><button onClick={() => toggleAutomation(automation)} className={`h-6 w-11 rounded-full p-1 ${automation.enabled ? 'bg-sky-300' : 'bg-zinc-600'}`}><span className={`block h-4 w-4 rounded-full bg-zinc-900 transition ${automation.enabled ? 'translate-x-5' : ''}`} /></button></div><h2 className="mt-5 font-bold">{automation.name}</h2><p className="mt-1 line-clamp-2 text-sm text-zinc-400">{automation.description || triggers.find((item) => item.id === automation.trigger_type)?.description}</p><div className="mt-auto flex gap-2 pt-5"><button onClick={() => openBuilder(automation)} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-sky-300/70 px-3 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-400/10"><Settings2 size={15} /> Abrir automação</button>{automation.trigger_type === 'manual' && <button onClick={() => runManual(automation)} className="rounded-md border border-white/15 p-2 text-zinc-300 hover:bg-white/5"><Play size={16} /></button>}</div></article>)}</div>
      </div></main>

      <Modal open={createStep !== 'closed'} title={createStep === 'choice' ? 'Como você deseja começar?' : 'Criar nova automação'} onClose={() => setCreateStep('closed')}>
        {createStep === 'choice' ? <div><p className="mb-6 text-center text-sm text-zinc-400">Crie sua nova automação e aumente seus resultados.</p><div className="grid gap-3 sm:grid-cols-3"><button onClick={() => setCreateStep('form')} className="rounded-lg border border-sky-300/60 bg-sky-400/5 p-6 text-center"><FileJson className="mx-auto text-sky-300" /><div className="mt-3 font-semibold">Em branco</div><div className="mt-2 text-xs text-zinc-400">Comece do zero</div></button><label className="rounded-lg border border-sky-400/40 hover:border-sky-300 p-6 text-center bg-sky-400/5 hover:bg-sky-400/10 cursor-pointer transition block"><input type="file" accept=".json" className="hidden" onChange={(e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const res = ev.target?.result;
      if (typeof res === "string") {
        const d = JSON.parse(res);
        setName(d.name || f.name.replace(".json", ""));
        setDescription(d.description || "Fluxo importado via JSON");
        setCreateStep("form");
      }
    } catch {
      alert("Arquivo JSON inválido.");
    }
  };
  reader.readAsText(f);
}} /><Activity className="mx-auto text-sky-400" /><div className="mt-3 font-semibold text-white">Importar</div><div className="mt-2 text-xs text-sky-300">Carregar arquivo .json</div></label><button type="button" onClick={() => { setName("Fluxo Modelo WhatsApp"); setDescription("Automação base pré-configurada"); setCreateStep("form"); }} className="rounded-lg border border-sky-400/40 hover:border-sky-300 p-6 text-center bg-sky-400/5 hover:bg-sky-400/10 cursor-pointer transition"><Workflow className="mx-auto text-sky-400" /><div className="mt-3 font-semibold text-white">Modelo</div><div className="mt-2 text-xs text-sky-300">Escolher template</div></button></div></div> : <form onSubmit={createAutomation} className="space-y-4"><button type="button" onClick={() => setCreateStep('choice')} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16} /> Voltar</button><label className="block text-sm"><span className="mb-2 block font-medium">Nome</span><input autoFocus maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da automação" className="w-full rounded-md border border-white/20 bg-zinc-950 px-3 py-3 outline-none focus:border-sky-300" /></label><label className="block text-sm"><span className="mb-2 block font-medium">Descrição</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição da automação" className="min-h-24 w-full rounded-md border border-white/20 bg-zinc-950 px-3 py-3 outline-none focus:border-sky-300" /></label><label className="block text-sm"><span className="mb-2 block font-medium">Grupo</span><select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-md border border-white/20 bg-zinc-950 px-3 py-3">{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="flex gap-2"><input value={newGroup} onChange={(event) => setNewGroup(event.target.value)} placeholder="Criar outro grupo" className="min-w-0 flex-1 rounded-md border border-white/15 bg-zinc-950 px-3 py-2 text-sm" /><button type="button" onClick={createGroup} className="rounded-md border border-white/15 px-3 text-sm">Criar grupo</button></div><button disabled={saving || !name.trim()} className="w-full rounded-md bg-sky-300 py-3 font-semibold text-zinc-950 disabled:opacity-50">Confirmar</button></form>}
      </Modal>

      <Modal open={builderOpen} title={selected ? `Automação: ${selected.name}` : 'Automação'} onClose={() => setBuilderOpen(false)} size="lg">
        {selected && <div><div className="mb-5 flex flex-wrap items-center gap-2"><button onClick={() => toggleAutomation(selected)} className={`rounded-md px-3 py-2 text-sm font-semibold ${selected.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-700 text-zinc-300'}`}>{selected.enabled ? 'Ativa' : 'Ativar automação'}</button>{selected.trigger_type === 'manual' && <button onClick={() => runManual(selected)} className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm"><Play size={15} /> Testar agora</button>}<button onClick={() => deleteAutomation(selected)} className="ml-auto flex items-center gap-2 rounded-md border border-red-500/30 px-3 py-2 text-sm text-red-300"><Trash2 size={15} /> Excluir</button></div><div className="grid gap-5 lg:grid-cols-[180px_1fr]"><nav className="space-y-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${category === item ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}><Globe2 size={15} /> {item}</button>)}</nav><div><h3 className="font-bold">{category}</h3><p className="mb-3 text-sm text-zinc-400">Escolha o gatilho que inicia esta automação.</p><div className="space-y-2">{triggers.filter((trigger) => trigger.category === category).map((trigger) => { const Icon = trigger.icon; const active = selected.trigger_type === trigger.id; return <button key={trigger.id} disabled={!trigger.available} onClick={() => chooseTrigger(trigger)} className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left ${active ? 'border-sky-300 bg-sky-400/10' : 'border-white/15 hover:bg-white/5'} disabled:cursor-not-allowed disabled:opacity-40`}><Icon className={active ? 'text-sky-300' : 'text-zinc-400'} size={20} /><span className="flex-1"><span className="block text-sm font-semibold">{trigger.title}</span><span className="mt-1 block text-xs text-zinc-400">{trigger.description}</span></span>{active && <Check className="text-sky-300" size={18} />}</button>; })}</div></div></div>

          {selected.trigger_type === 'incoming_webhook' && <div className="mt-5 rounded-lg border border-sky-400/30 bg-sky-400/5 p-4"><div className="flex items-center gap-2 font-semibold"><Webhook className="text-sky-300" size={18} /> Webhook de entrada</div><p className="mt-1 text-xs text-zinc-400">Envie uma requisição POST com JSON para esta URL. Ela só executa quando a automação estiver ativa.</p><div className="mt-3 flex gap-2"><input readOnly value={webhookUrl(selected)} className="min-w-0 flex-1 rounded-md border border-white/15 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300" /><button onClick={() => copyWebhook(selected)} className="rounded-md border border-white/15 px-3"><Copy size={16} /></button></div></div>}

          <div className="mt-5 rounded-lg border border-white/15 bg-zinc-950/30 p-4"><div className="flex items-center gap-2 font-semibold"><Globe2 className="text-violet-300" size={18} /> Ação: enviar webhook HTTP</div><p className="mt-1 text-xs text-zinc-400">Quando o gatilho ocorrer, o Z10 enviará os dados para uma URL HTTPS.</p><div className="mt-4 grid gap-3 sm:grid-cols-[130px_1fr_auto]"><select value={outboundMethod} onChange={(event) => setOutboundMethod(event.target.value)} className="rounded-md border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm"><option>POST</option><option>PUT</option><option>PATCH</option></select><input value={outboundUrl} onChange={(event) => setOutboundUrl(event.target.value)} placeholder="https://seu-sistema.com/webhook" className="min-w-0 rounded-md border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-sky-300" /><button onClick={saveAction} disabled={saving} className="rounded-md bg-sky-300 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50">Salvar ação</button></div></div>
        </div>}
      </Modal>
    </div>
  );
}
