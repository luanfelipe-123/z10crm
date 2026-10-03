'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Lead = { id: string; name: string | null; source: string | null; created_at: string };

export default function LeadsPage() {
  const [tenantId, setTenantId] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [name, setName] = useState('');
  const [source, setSource] = useState('Manual');
  const [msg, setMsg] = useState('');

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: m } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (!m) return;
    setTenantId(m.tenant_id);
    const { data } = await supabase.from('leads').select('id,name,source,created_at').eq('tenant_id', m.tenant_id).order('created_at', { ascending: false });
    setLeads(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function addLead(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!tenantId || !name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: lead, error } = await supabase.from('leads').insert({ tenant_id: tenantId, name: name.trim(), source, owner_id: user.id }).select('id,name').single();
    if (error || !lead) { setMsg(error?.message ?? 'Erro ao cadastrar lead'); return; }

    const { data: pipeline } = await supabase.from('pipelines').select('id').eq('tenant_id', tenantId).limit(1).maybeSingle();
    if (pipeline) {
      const { data: stage } = await supabase.from('stages').select('id').eq('pipeline_id', pipeline.id).order('position').limit(1).maybeSingle();
      if (stage) {
        await supabase.from('deals').insert({ tenant_id: tenantId, lead_id: lead.id, pipeline_id: pipeline.id, stage_id: stage.id, title: lead.name, status: 'open', owner_id: user.id });
      }
    }

    setName('');
    setMsg('Lead cadastrado e enviado ao pipeline.');
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Leads</h1>
      <p className="mt-1 text-zinc-400">Cadastre contatos para testar o Z10 CRM.</p>
      <form onSubmit={addLead} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 md:grid-cols-[1fr_240px_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do lead" className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 outline-none focus:border-sky-500" />
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Origem" className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 outline-none focus:border-sky-500" />
        <button className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-zinc-950 hover:bg-sky-400">Adicionar lead</button>
      </form>
      {msg && <div className="mt-3 text-sm text-sky-300">{msg}</div>}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[1fr_220px_180px] bg-zinc-950 px-5 py-3 text-xs uppercase tracking-wide text-zinc-500"><div>Nome</div><div>Origem</div><div>Criado em</div></div>
        {leads.map((lead) => <div key={lead.id} className="grid grid-cols-[1fr_220px_180px] border-t border-white/5 px-5 py-4 text-sm"><div className="font-medium">{lead.name}</div><div className="text-zinc-400">{lead.source || '—'}</div><div className="text-zinc-500">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</div></div>)}
        {!leads.length && <div className="p-6 text-sm text-zinc-500">Nenhum lead cadastrado ainda.</div>}
      </div>
    </div>
  );
}
