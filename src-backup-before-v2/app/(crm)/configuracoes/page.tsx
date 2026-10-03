'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  GitBranch,
  Loader2,
  Plus,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Pipeline = {
  id: string;
  name: string;
};

type Stage = {
  id: string;
  name: string;
  position: number;
};

type Notice = {
  kind: 'success' | 'error';
  text: string;
} | null;

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [newStageName, setNewStageName] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setNotice({ kind: 'error', text: 'Não foi possível identificar o usuário conectado.' });
      setLoading(false);
      return;
    }

    setEmail(user.email ?? '');

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      setNotice({ kind: 'error', text: 'Seu usuário ainda não está vinculado a uma empresa.' });
      setLoading(false);
      return;
    }

    setTenantId(membership.tenant_id);

    const [{ data: tenant, error: tenantError }, { data: pipelineData, error: pipelineError }] = await Promise.all([
      supabase.from('tenants').select('id,name').eq('id', membership.tenant_id).single(),
      supabase.from('pipelines').select('id,name').eq('tenant_id', membership.tenant_id).limit(1).maybeSingle(),
    ]);

    if (tenantError) {
      setNotice({ kind: 'error', text: tenantError.message });
      setLoading(false);
      return;
    }

    setTenantName(tenant.name ?? '');

    if (pipelineError) {
      setNotice({ kind: 'error', text: pipelineError.message });
      setLoading(false);
      return;
    }

    setPipeline(pipelineData);

    if (pipelineData) {
      const { data: stageData, error: stageError } = await supabase
        .from('stages')
        .select('id,name,position')
        .eq('pipeline_id', pipelineData.id)
        .order('position');

      if (stageError) {
        setNotice({ kind: 'error', text: stageError.message });
      } else {
        setStages(stageData ?? []);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // A leitura inicial acontece no cliente porque a sessão pertence ao Supabase Auth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, [loadSettings]);

  function showSuccess(text: string) {
    setNotice({ kind: 'success', text });
  }

  function showError(error: unknown, fallback: string) {
    const message = error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback;
    setNotice({ kind: 'error', text: message });
  }

  async function saveTenant(e: FormEvent) {
    e.preventDefault();
    const name = tenantName.trim();
    if (!tenantId || !name) return;

    setSaving('tenant');
    setNotice(null);
    const { error } = await supabase.from('tenants').update({ name }).eq('id', tenantId);
    setSaving('');

    if (error) {
      showError(error, 'Não foi possível salvar a empresa.');
      return;
    }

    setTenantName(name);
    window.dispatchEvent(new CustomEvent('z10:tenant-name', { detail: name }));
    showSuccess('Nome da empresa atualizado.');
  }

  async function savePipeline(e: FormEvent) {
    e.preventDefault();
    const name = pipeline?.name.trim();
    if (!pipeline || !name) return;

    setSaving('pipeline');
    setNotice(null);
    const { error } = await supabase.from('pipelines').update({ name }).eq('id', pipeline.id);
    setSaving('');

    if (error) {
      showError(error, 'Não foi possível salvar o pipeline.');
      return;
    }

    setPipeline({ ...pipeline, name });
    showSuccess('Pipeline atualizado.');
  }

  async function addStage(e: FormEvent) {
    e.preventDefault();
    const name = newStageName.trim();
    if (!pipeline || !name) return;

    setSaving('new-stage');
    setNotice(null);
    const nextPosition = stages.length ? Math.max(...stages.map((stage) => stage.position)) + 1 : 1;
    const { data, error } = await supabase
      .from('stages')
      .insert({ pipeline_id: pipeline.id, name, position: nextPosition })
      .select('id,name,position')
      .single();
    setSaving('');

    if (error || !data) {
      showError(error, 'Não foi possível adicionar a etapa.');
      return;
    }

    setStages((current) => [...current, data]);
    setNewStageName('');
    showSuccess('Nova etapa adicionada.');
  }

  async function renameStage(stage: Stage) {
    const name = stage.name.trim();
    if (!name) return;

    setSaving(stage.id);
    setNotice(null);
    const { error } = await supabase.from('stages').update({ name }).eq('id', stage.id);
    setSaving('');

    if (error) {
      showError(error, 'Não foi possível renomear a etapa.');
      return;
    }

    setStages((current) => current.map((item) => item.id === stage.id ? { ...item, name } : item));
    showSuccess('Etapa atualizada.');
  }

  async function moveStage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= stages.length) return;

    const currentStage = stages[index];
    const nextStage = stages[nextIndex];
    const reordered = [...stages];
    reordered[index] = { ...nextStage, position: currentStage.position };
    reordered[nextIndex] = { ...currentStage, position: nextStage.position };
    reordered.sort((a, b) => a.position - b.position);
    setStages(reordered);
    setSaving('order');
    setNotice(null);

    const [{ error: currentError }, { error: nextError }] = await Promise.all([
      supabase.from('stages').update({ position: nextStage.position }).eq('id', currentStage.id),
      supabase.from('stages').update({ position: currentStage.position }).eq('id', nextStage.id),
    ]);
    setSaving('');

    if (currentError || nextError) {
      setStages(stages);
      showError(currentError ?? nextError, 'Não foi possível reordenar as etapas.');
      return;
    }

    showSuccess('Ordem das etapas atualizada.');
  }

  async function removeStage(stage: Stage) {
    const confirmed = window.confirm(`Excluir a etapa "${stage.name}"?`);
    if (!confirmed) return;

    setSaving(stage.id);
    setNotice(null);
    const { count, error: countError } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage_id', stage.id);

    if (countError) {
      setSaving('');
      showError(countError, 'Não foi possível verificar a etapa.');
      return;
    }

    if ((count ?? 0) > 0) {
      setSaving('');
      setNotice({ kind: 'error', text: 'Mova os negócios desta etapa antes de excluí-la.' });
      return;
    }

    const { error } = await supabase.from('stages').delete().eq('id', stage.id);
    setSaving('');

    if (error) {
      showError(error, 'Não foi possível excluir a etapa.');
      return;
    }

    setStages((current) => current.filter((item) => item.id !== stage.id));
    showSuccess('Etapa excluída.');
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-zinc-400">
        <Loader2 className="mr-3 animate-spin" size={22} /> Carregando configurações...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="mt-2 text-zinc-400">Gerencie sua empresa, sua conta e a estrutura comercial.</p>
      </div>

      {notice && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm ${notice.kind === 'success' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>
          {notice.kind === 'success' && <CheckCircle2 size={18} />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid gap-6">
        <SettingsCard icon={Building2} title="Empresa" description="Este nome aparece no menu do CRM.">
          <form onSubmit={saveTenant} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Nome da empresa"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 outline-none focus:border-sky-500"
            />
            <SaveButton loading={saving === 'tenant'} label="Salvar empresa" />
          </form>
        </SettingsCard>

        <SettingsCard icon={UserRound} title="Sua conta" description="Usuário autenticado pelo Supabase.">
          <div className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-zinc-500">E-mail</div>
            <div className="mt-1 text-sm text-zinc-200">{email || '—'}</div>
          </div>
        </SettingsCard>

        <SettingsCard icon={GitBranch} title="Pipeline e etapas" description="Organize o funil utilizado nas telas de leads e pipelines.">
          {!pipeline ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
              Nenhum pipeline foi encontrado para esta empresa.
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={savePipeline} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={pipeline.name}
                  onChange={(e) => setPipeline({ ...pipeline, name: e.target.value })}
                  placeholder="Nome do pipeline"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 outline-none focus:border-sky-500"
                />
                <SaveButton loading={saving === 'pipeline'} label="Salvar pipeline" />
              </form>

              <div>
                <div className="mb-3 text-sm font-medium text-zinc-300">Etapas do funil</div>
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div key={stage.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-900 p-3 sm:flex-row sm:items-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-semibold text-zinc-400">
                        {index + 1}
                      </div>
                      <input
                        value={stage.name}
                        onChange={(e) => setStages((current) => current.map((item) => item.id === stage.id ? { ...item, name: e.target.value } : item))}
                        onBlur={() => renameStage(stage)}
                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2 outline-none hover:border-white/10 focus:border-sky-500 focus:bg-zinc-950"
                      />
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <IconButton label="Mover para cima" disabled={index === 0 || saving === 'order'} onClick={() => moveStage(index, -1)}>
                          <ArrowUp size={16} />
                        </IconButton>
                        <IconButton label="Mover para baixo" disabled={index === stages.length - 1 || saving === 'order'} onClick={() => moveStage(index, 1)}>
                          <ArrowDown size={16} />
                        </IconButton>
                        <IconButton label="Excluir etapa" disabled={saving === stage.id || stages.length === 1} danger onClick={() => removeStage(stage)}>
                          {saving === stage.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={addStage} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Nome da nova etapa"
                    className="min-w-0 flex-1 rounded-lg border border-dashed border-white/15 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-500"
                  />
                  <button
                    disabled={!newStageName.trim() || saving === 'new-stage'}
                    className="flex items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving === 'new-stage' ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
                    Adicionar etapa
                  </button>
                </form>
              </div>
            </div>
          )}
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60">
      <div className="flex items-start gap-4 border-b border-white/10 p-5 sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
          <Icon size={21} />
        </div>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SaveButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
      {label}
    </button>
  );
}

function IconButton({
  label,
  disabled,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-25 ${danger ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}
    >
      {children}
    </button>
  );
}
