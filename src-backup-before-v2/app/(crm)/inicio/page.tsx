'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function InicioPage() {
  const [stats, setStats] = useState({ leads: 0, deals: 0, open: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
      if (!m) return;
      const [leads, deals, open] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', m.tenant_id),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('tenant_id', m.tenant_id),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('tenant_id', m.tenant_id).eq('status', 'open'),
      ]);
      setStats({ leads: leads.count ?? 0, deals: deals.count ?? 0, open: open.count ?? 0 });
    })();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Visão geral</h1>
        <p className="mt-1 text-zinc-400">Seu protótipo Z10 CRM já está conectado ao Supabase.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Leads" value={stats.leads} />
        <Card label="Negócios" value={stats.deals} />
        <Card label="Em aberto" value={stats.open} />
      </div>
      <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-950/60 p-6">
        <h2 className="font-semibold">Primeiro teste</h2>
        <p className="mt-2 text-sm text-zinc-400">Abra “Leads”, cadastre um lead e depois vá para “Pipelines”. O card será criado automaticamente na primeira etapa do funil.</p>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6"><div className="text-sm text-zinc-400">{label}</div><div className="mt-2 text-4xl font-bold">{value}</div></div>;
}
