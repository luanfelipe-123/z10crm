'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Stage = { id: string; name: string; position: number };
type Deal = { id: string; title: string | null; stage_id: string; status: string };

export default function PipelinesPage() {
  const [pipelineName, setPipelineName] = useState('Pipeline');
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: m } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (!m) return;
    const { data: pipeline } = await supabase.from('pipelines').select('id,name').eq('tenant_id', m.tenant_id).limit(1).maybeSingle();
    if (!pipeline) return;
    setPipelineName(pipeline.name);
    const [{ data: s }, { data: d }] = await Promise.all([
      supabase.from('stages').select('id,name,position').eq('pipeline_id', pipeline.id).order('position'),
      supabase.from('deals').select('id,title,stage_id,status').eq('pipeline_id', pipeline.id).order('created_at', { ascending: false }),
    ]);
    setStages(s ?? []);
    setDeals(d ?? []);
  }

  useEffect(() => { load(); }, []);

  async function move(deal: Deal, direction: -1 | 1) {
    const current = stages.findIndex((s) => s.id === deal.stage_id);
    const next = stages[current + direction];
    if (!next) return;
    let status = 'open';
    if (next.name.toLowerCase() === 'ganho') status = 'won';
    if (next.name.toLowerCase() === 'perdido') status = 'lost';
    await supabase.from('deals').update({ stage_id: next.id, status }).eq('id', deal.id);
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">{pipelineName}</h1>
      <p className="mt-1 text-zinc-400">Use as setas para mover os negócios entre as etapas.</p>
      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage, idx) => {
          const items = deals.filter((d) => d.stage_id === stage.id);
          return (
            <section key={stage.id} className="w-72 shrink-0 rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
              <div className="mb-3 flex items-center justify-between px-1"><h2 className="font-semibold">{stage.name}</h2><span className="rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-400">{items.length}</span></div>
              <div className="space-y-3">
                {items.map((deal) => <article key={deal.id} className="rounded-xl border border-white/10 bg-zinc-900 p-4"><div className="font-medium">{deal.title || 'Negócio'}</div><div className="mt-4 flex justify-between"><button disabled={idx === 0} onClick={() => move(deal, -1)} className="rounded-md border border-white/10 px-3 py-1.5 text-sm disabled:opacity-20">←</button><button disabled={idx === stages.length - 1} onClick={() => move(deal, 1)} className="rounded-md border border-white/10 px-3 py-1.5 text-sm disabled:opacity-20">→</button></div></article>)}
                {!items.length && <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-600">Sem cards</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
