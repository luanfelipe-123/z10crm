'use client';

import { useEffect, useState } from 'react';
import { Check, CreditCard, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InitialAvatar, SettingsPageHeader, SettingsPanel, UsageBar } from '@/components/settings/SettingsUI';

type Usage = { leads: number; members: number; connections: number; integrations: number; automations: number; pipelines: number };

const limits: Usage = { leads: 5000, members: 4, connections: 3, integrations: 3, automations: 50, pipelines: 100 };

export default function PlanosPage() {
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('Z10 CRM');
  const [email, setEmail] = useState('');
  const [usage, setUsage] = useState<Usage>({ leads: 0, members: 0, connections: 0, integrations: 0, automations: 0, pipelines: 0 });

  async function loadUsage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    setEmail(user.email ?? '');

    const { data: membership } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (!membership) return setLoading(false);

    const [{ data: tenant }, leads, members, pipelines, connections, automations] = await Promise.all([
      supabase.from('tenants').select('name').eq('id', membership.tenant_id).single(),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', membership.tenant_id),
      supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('tenant_id', membership.tenant_id).eq('active', true),
      supabase.from('pipelines').select('*', { count: 'exact', head: true }).eq('tenant_id', membership.tenant_id),
      supabase.from('connections').select('*', { count: 'exact', head: true }).eq('tenant_id', membership.tenant_id),
      supabase.from('automations').select('*', { count: 'exact', head: true }).eq('tenant_id', membership.tenant_id),
    ]);

    setTenantName(tenant?.name ?? 'Z10 CRM');
    setUsage((current) => ({ ...current, leads: leads.count ?? 0, members: members.count ?? 0, pipelines: pipelines.count ?? 0, connections: connections.count ?? 0, automations: automations.count ?? 0 }));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsage();
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 animate-spin" size={20} /> Carregando uso...</div>;

  const cards: Array<[keyof Usage, string]> = [
    ['leads', 'Leads'], ['members', 'Membros'], ['connections', 'Conexões'],
    ['integrations', 'Integrações'], ['automations', 'Automações'], ['pipelines', 'Pipelines'],
  ];

  return (
    <div className="space-y-4">
      <SettingsPanel className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300"><CreditCard size={22} /></div>
          <div><h1 className="text-xl font-bold">Planos e uso</h1><p className="text-sm text-zinc-400">Acompanhe os limites do seu ambiente Z10.</p></div>
        </div>
        <div className="flex items-center gap-3 border-white/10 sm:border-l sm:pl-5">
          <InitialAvatar name={tenantName} size="sm" />
          <div><div className="text-sm font-semibold">{tenantName}</div><div className="text-xs text-zinc-400">{email}</div></div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex flex-col gap-4 border-b border-white/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-2xl font-bold text-sky-300">Starter</div><div className="mt-1 text-sm text-zinc-400">Plano inicial para validar seu CRM.</div></div>
          <button disabled className="cursor-not-allowed rounded-md border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-300 opacity-60">Gerenciar plano</button>
        </div>
        <div className="grid gap-5 border-b border-white/15 p-6 sm:grid-cols-3">
          <Metric label="Renovação" value="Não configurada" />
          <Metric label="Valor" value="Sem cobrança" />
          <Metric label="Método de pagamento" value="Não cadastrado" />
        </div>
        <div className="p-6">
          <div className="mb-5 text-sm font-semibold">Benefícios do plano</div>
          <div className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            {['Gerenciamento de leads e negócios', 'Pipelines sem limite', 'Até 4 membros', 'Até 50 automações', 'Conexões multicanal', 'Agentes de IA'].map((item) => <div key={item} className="flex items-center gap-2"><Check className="text-emerald-300" size={16} />{item}</div>)}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(([key, label]) => (
              <div key={key} className="rounded-md border border-white/15 p-4">
                <div className="font-semibold">{label}</div>
                <div className="mb-3 mt-2 text-xs text-zinc-400">{usage[key]} / {limits[key]}</div>
                <UsageBar value={usage[key]} max={limits[key]} />
              </div>
            ))}
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex items-center gap-3 border-b border-white/15 p-5"><Sparkles className="text-violet-300" /><h2 className="text-xl font-bold">Z10 IA</h2></div>
        <div className="p-6">
          <SettingsPageHeader title="Consumo de IA" description="O medidor de tokens será ativado quando o primeiro agente estiver conectado." />
          <UsageBar value={0} max={1000000} />
          <div className="mt-2 text-right text-sm font-semibold">0 / 1.000.000 tokens</div>
        </div>
      </SettingsPanel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-sm text-zinc-400">{label}</div><div className="mt-2 text-sm font-semibold">{value}</div></div>;
}
