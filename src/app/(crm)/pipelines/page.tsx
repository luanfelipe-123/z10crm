'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';

type Pipeline = { id: string; name: string; created_at: string };
type Stage = { id: string; pipeline_id: string; name: string; position: number; color: string };
type Deal = { id: string; title: string | null; stage_id: string; status: string; created_at: string };

const defaultStages = ['Novo', 'Em contato', 'Proposta', 'Ganho', 'Perdido'];
const colors = ['#38bdf8', '#a78bfa', '#f59e0b', '#4ade80', '#fb7185', '#f472b6'];

export default function PipelinesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStage, setNewStage] = useState('');

  async function loadPipelines(preferredId?: string) {
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    const { data: membership } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (!membership) return setLoading(false);
    setTenantId(membership.tenant_id);
    const { data, error: loadError } = await supabase.from('pipelines').select('id,name,created_at').eq('tenant_id', membership.tenant_id).order('created_at');
    if (loadError) setError(loadError.message);
    const rows = data ?? [];
    setPipelines(rows);
    setSelectedId((current) => preferredId ?? (current || rows[0]?.id || ''));
    setLoading(false);
  }

  async function loadBoard(pipelineId: string) {
    if (!pipelineId) { setStages([]); setDeals([]); return; }
    const [{ data: stageRows, error: stageError }, { data: dealRows, error: dealError }] = await Promise.all([
      supabase.from('stages').select('id,pipeline_id,name,position,color').eq('pipeline_id', pipelineId).order('position'),
      supabase.from('deals').select('id,title,stage_id,status,created_at').eq('pipeline_id', pipelineId).order('created_at', { ascending: false }),
    ]);
    if (stageError || dealError) setError(stageError?.message ?? dealError?.message ?? 'Erro ao carregar pipeline.');
    setStages(stageRows ?? []);
    setDeals(dealRows ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPipelines();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBoard(selectedId);
  }, [selectedId]);

  const selected = useMemo(() => pipelines.find((pipeline) => pipeline.id === selectedId), [pipelines, selectedId]);

  async function createPipeline(event: FormEvent) {
    event.preventDefault();
    if (!tenantId || !newName.trim()) return;
    setSaving(true); setError('');
    const { data: pipeline, error: pipelineError } = await supabase.from('pipelines').insert({ tenant_id: tenantId, name: newName.trim() }).select('id,name,created_at').single();
    if (pipelineError || !pipeline) { setSaving(false); return setError(pipelineError?.message ?? 'Não foi possível criar o pipeline.'); }
    const { error: stagesError } = await supabase.from('stages').insert(defaultStages.map((name, position) => ({ tenant_id: tenantId, pipeline_id: pipeline.id, name, position, color: colors[position] })));
    setSaving(false);
    if (stagesError) return setError(stagesError.message);
    setNewName(''); setCreateOpen(false);
    await loadPipelines(pipeline.id);
  }

  async function renamePipeline() {
    if (!selected) return;
    const name = window.prompt('Novo nome do pipeline:', selected.name)?.trim();
    if (!name || name === selected.name) return;
    const { error: updateError } = await supabase.from('pipelines').update({ name, updated_at: new Date().toISOString() }).eq('id', selected.id);
    if (updateError) return setError(updateError.message);
    setPipelines((current) => current.map((item) => item.id === selected.id ? { ...item, name } : item));
  }

  async function deletePipeline() {
    if (!selected || !window.confirm(`Excluir o pipeline "${selected.name}" e todos os negócios dele?`)) return;
    setSaving(true);
    await supabase.from('deals').delete().eq('pipeline_id', selected.id);
    await supabase.from('stages').delete().eq('pipeline_id', selected.id);
    const { error: deleteError } = await supabase.from('pipelines').delete().eq('id', selected.id);
    setSaving(false);
    if (deleteError) return setError(deleteError.message);
    setManageOpen(false);
    setSelectedId('');
    await loadPipelines();
  }

  async function addStage(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !newStage.trim()) return;
    const { error: insertError } = await supabase.from('stages').insert({ tenant_id: tenantId, pipeline_id: selectedId, name: newStage.trim(), position: stages.length, color: colors[stages.length % colors.length] });
    if (insertError) return setError(insertError.message);
    setNewStage('');
    await loadBoard(selectedId);
  }

  async function renameStage(stage: Stage) {
    const name = window.prompt('Novo nome da etapa:', stage.name)?.trim();
    if (!name || name === stage.name) return;
    const { error: updateError } = await supabase.from('stages').update({ name, updated_at: new Date().toISOString() }).eq('id', stage.id);
    if (updateError) return setError(updateError.message);
    await loadBoard(selectedId);
  }

  async function deleteStage(stage: Stage) {
    if (stages.length === 1) return setError('O pipeline precisa ter pelo menos uma etapa.');
    if (deals.some((deal) => deal.stage_id === stage.id)) return setError('Mova os negócios desta etapa antes de excluí-la.');
    if (!window.confirm(`Excluir a etapa "${stage.name}"?`)) return;
    const { error: deleteError } = await supabase.from('stages').delete().eq('id', stage.id);
    if (deleteError) return setError(deleteError.message);
    await loadBoard(selectedId);
  }

  async function move(deal: Deal, direction: -1 | 1) {
    const current = stages.findIndex((stage) => stage.id === deal.stage_id);
    const next = stages[current + direction];
    if (!next) return;
    let status = 'open';
    if (next.name.toLowerCase().includes('ganho')) status = 'won';
    if (next.name.toLowerCase().includes('perdid')) status = 'lost';
    const { error: moveError } = await supabase.from('deals').update({ stage_id: next.id, status, updated_at: new Date().toISOString() }).eq('id', deal.id);
    if (moveError) return setError(moveError.message);
    setDeals((currentDeals) => currentDeals.map((item) => item.id === deal.id ? { ...item, stage_id: next.id, status } : item));

    const { data: { session } } = await supabase.auth.getSession();
    if (session) void fetch('/api/automations/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ event: 'deal_moved', payload: { dealId: deal.id, title: deal.title, fromStageId: deal.stage_id, toStageId: next.id, status } }),
    });
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 animate-spin" size={20} /> Carregando pipelines...</div>;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-bold">Pipelines</h1><p className="mt-1 text-zinc-400">Crie quantos funis precisar e organize suas etapas.</p></div>
        <div className="flex flex-wrap gap-2">
          {pipelines.length > 0 && <div className="relative"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="appearance-none rounded-lg border border-white/15 bg-zinc-950 py-2.5 pl-4 pr-10 text-sm outline-none focus:border-sky-400">{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} /></div>}
          <button onClick={() => setManageOpen(true)} disabled={!selected} className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-40"><Settings2 size={17} /> Gerenciar</button>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-sky-300"><Plus size={17} /> Novo pipeline</button>
        </div>
      </div>

      {error && <div className="mt-5 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}<button onClick={() => setError('')}><X size={16} /></button></div>}

      {!selected ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-zinc-950/40 p-14 text-center"><h2 className="text-xl font-semibold">Crie seu primeiro pipeline</h2><p className="mt-2 text-sm text-zinc-400">As etapas padrão serão criadas automaticamente e poderão ser editadas.</p><button onClick={() => setCreateOpen(true)} className="mt-5 rounded-lg bg-sky-400 px-5 py-2.5 font-semibold text-zinc-950">Criar pipeline</button></div>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-5">
          {stages.map((stage, index) => {
            const items = deals.filter((deal) => deal.stage_id === stage.id);
            return <section key={stage.id} className="w-80 shrink-0 rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="mb-3 flex items-center justify-between rounded-lg px-2 py-1.5"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} /><h2 className="font-semibold">{stage.name}</h2></div><span className="rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-400">{items.length}</span></div><div className="space-y-3">{items.map((deal) => <article key={deal.id} className="rounded-xl border border-white/10 bg-zinc-900 p-4"><div className="font-medium">{deal.title || 'Negócio'}</div><div className="mt-1 text-xs text-zinc-500">Criado em {new Date(deal.created_at).toLocaleDateString('pt-BR')}</div><div className="mt-4 flex justify-between"><button disabled={index === 0} onClick={() => move(deal, -1)} className="rounded-md border border-white/10 p-2 hover:bg-white/5 disabled:opacity-20"><ChevronLeft size={16} /></button><button disabled={index === stages.length - 1} onClick={() => move(deal, 1)} className="rounded-md border border-white/10 p-2 hover:bg-white/5 disabled:opacity-20"><ChevronRight size={16} /></button></div></article>)}{!items.length && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-600">Sem negócios</div>}</div></section>;
          })}
        </div>
      )}

      <Modal open={createOpen} title="Criar novo pipeline" onClose={() => setCreateOpen(false)} size="sm"><form onSubmit={createPipeline} className="space-y-4"><label className="block text-sm"><span className="mb-2 block font-medium">Nome do pipeline</span><input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex.: Comercial" className="w-full rounded-lg border border-white/15 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-400" /></label><p className="text-xs text-zinc-500">O Z10 criará cinco etapas iniciais. Não há limite de pipelines.</p><button disabled={saving || !newName.trim()} className="w-full rounded-lg bg-sky-400 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50">{saving ? 'Criando...' : 'Criar pipeline'}</button></form></Modal>

      <Modal open={manageOpen} title={`Gerenciar ${selected?.name ?? 'pipeline'}`} onClose={() => setManageOpen(false)}><div className="mb-5 flex flex-wrap gap-2"><button onClick={renamePipeline} className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5"><Pencil size={15} /> Renomear pipeline</button><button onClick={deletePipeline} disabled={saving} className="flex items-center gap-2 rounded-md border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Trash2 size={15} /> Excluir pipeline</button></div><form onSubmit={addStage} className="mb-4 flex gap-2"><input value={newStage} onChange={(event) => setNewStage(event.target.value)} placeholder="Nome da nova etapa" className="min-w-0 flex-1 rounded-md border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-sky-400" /><button disabled={!newStage.trim()} className="flex items-center gap-2 rounded-md bg-sky-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50"><Plus size={16} /> Adicionar</button></form><div className="space-y-2">{stages.map((stage) => <div key={stage.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/50 p-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} /><span className="flex-1 text-sm font-medium">{stage.position + 1}. {stage.name}</span><button onClick={() => renameStage(stage)} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button><button onClick={() => deleteStage(stage)} className="p-2 text-zinc-400 hover:text-red-300"><Trash2 size={16} /></button></div>)}</div></Modal>
    </div>
  );
}
