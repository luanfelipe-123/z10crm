'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, CircleDollarSign, Lightbulb, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function InicioPage() {
  const [stats, setStats] = useState({ leads: 0, deals: 0, open: 0 });
  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data: m } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle(); if (!m) return; const [leads, deals, open] = await Promise.all([supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', m.tenant_id), supabase.from('deals').select('*', { count: 'exact', head: true }).eq('tenant_id', m.tenant_id), supabase.from('deals').select('*', { count: 'exact', head: true }).eq('tenant_id', m.tenant_id).eq('status', 'open')]); setStats({ leads: leads.count ?? 0, deals: deals.count ?? 0, open: open.count ?? 0 }); })(); }, []);
  return <div>
    <div className="page-heading"><div><div className="page-heading__eyebrow">Dashboard</div><h1>Visão geral</h1><p>Acompanhe os principais números da sua operação.</p></div><div className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted sm:flex"><ArrowUpRight size={15} className="text-success"/> Dados atualizados</div></div>
    <div className="metric-grid"><Card icon={Users} label="Leads" value={stats.leads}/><Card icon={BriefcaseBusiness} label="Negócios" value={stats.deals}/><Card icon={CircleDollarSign} label="Em aberto" value={stats.open}/></div>
    <div className="crm-card crm-callout"><div className="crm-callout__icon"><Lightbulb size={19}/></div><div><h2 className="text-sm font-bold">Próximo passo</h2><p className="mt-1 text-sm leading-6 text-muted">Cadastre um lead e acompanhe sua jornada no pipeline. O card será criado automaticamente na primeira etapa do funil.</p></div></div>
  </div>;
}
function Card({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) { return <div className="crm-card metric-card"><div className="metric-card__icon"><Icon size={19}/></div><div className="metric-card__label">{label}</div><div className="metric-card__value">{value}</div></div>; }
