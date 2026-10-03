'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InitialAvatar, SettingsPageHeader, SettingsPanel } from '@/components/settings/SettingsUI';

type Member = { userId: string; name: string; email: string; active: boolean; role: string };

export default function MembrosPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');

  async function loadMembers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    const { data: ownMembership } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (!ownMembership) return setLoading(false);

    const { data: memberships } = await supabase.from('memberships').select('user_id,active,role').eq('tenant_id', ownMembership.tenant_id);
    const ids = (memberships ?? []).map((item) => item.user_id);
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id,full_name,email').in('id', ids) : { data: [] };

    const rows = (memberships ?? []).map((item) => {
      const profile = (profiles ?? []).find((candidate) => candidate.id === item.user_id);
      const isCurrent = item.user_id === user.id;
      return {
        userId: item.user_id,
        name: profile?.full_name ?? (isCurrent ? user.user_metadata?.full_name : '') ?? 'Membro',
        email: profile?.email ?? (isCurrent ? user.email : '') ?? 'E-mail protegido',
        active: item.active,
        role: item.role ?? 'member',
      };
    });

    setMembers(rows);
    setSelectedId(rows[0]?.userId ?? '');
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMembers();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(query));
  }, [members, search]);

  const selected = members.find((member) => member.userId === selectedId) ?? members[0];

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 animate-spin" size={20} /> Carregando membros...</div>;

  return (
    <div>
      <SettingsPageHeader
        title="Membros"
        description="Centralize membros e níveis de acesso da organização."
        action={<button disabled className="flex cursor-not-allowed items-center gap-2 rounded-md bg-sky-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 opacity-60"><UserPlus size={16} /> Convidar membro</button>}
      />

      <SettingsPanel className="mb-4 p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail" className="w-full rounded-md border border-white/20 bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-300" /></div>
      </SettingsPanel>

      <div className="grid gap-4 lg:grid-cols-[310px_1fr]">
        <SettingsPanel className="p-3">
          <div className="mb-3 flex items-center justify-between px-1"><span className="text-sm font-semibold">Membros</span><span className="rounded border border-white/15 px-2 py-0.5 text-xs">{filtered.length}</span></div>
          <div className="space-y-2">
            {filtered.map((member) => (
              <button key={member.userId} onClick={() => setSelectedId(member.userId)} className={`flex w-full items-start gap-3 rounded-md border p-3 text-left ${selected?.userId === member.userId ? 'border-sky-300 bg-sky-400/10' : 'border-white/10 hover:bg-white/5'}`}>
                <InitialAvatar name={member.name} size="sm" />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{member.name}</div><div className="truncate text-xs text-zinc-400">{member.email}</div><div className="mt-2 flex flex-wrap gap-1"><Badge>{member.active ? 'Ativo' : 'Inativo'}</Badge><Badge accent>{member.role === 'admin' ? 'Administrador' : 'Membro'}</Badge></div></div>
              </button>
            ))}
            {!filtered.length && <div className="p-5 text-center text-sm text-zinc-500">Nenhum membro encontrado.</div>}
          </div>
        </SettingsPanel>

        <div className="space-y-4">
          {selected ? (
            <>
              <SettingsPanel className="p-5">
                <div className="flex items-center gap-3"><InitialAvatar name={selected.name} size="sm" /><div><div className="flex items-center gap-2 font-semibold">{selected.name}<Badge>{selected.active ? 'Ativo' : 'Inativo'}</Badge><Badge accent>{selected.role === 'admin' ? 'Administrador' : 'Membro'}</Badge></div><div className="text-sm text-zinc-400">{selected.email}</div></div></div>
                {selected.role === 'admin' && <div className="mt-4 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"><ShieldCheck size={20} />Administrador geral: pode acessar e gerenciar as configurações da organização.</div>}
              </SettingsPanel>
              <PermissionCard icon={Users} title="CRM e pipelines" description="Ajuste as restrições de acesso aos pipelines." />
              <PermissionCard icon={ShieldCheck} title="Multiatendimento" description="Permissões de conexões e departamentos serão configuradas aqui." />
            </>
          ) : <SettingsPanel className="p-8 text-center text-zinc-500">Nenhum membro cadastrado.</SettingsPanel>}
        </div>
      </div>
    </div>
  );
}

function Badge({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <span className={`rounded border px-2 py-0.5 text-[11px] ${accent ? 'border-amber-500/60 bg-amber-500/10 text-amber-300' : 'border-white/15 bg-white/5 text-zinc-300'}`}>{children}</span>;
}

function PermissionCard({ icon: Icon, title, description }: { icon: typeof Users; title: string; description: string }) {
  return <SettingsPanel className="p-5"><div className="flex items-center gap-2 font-semibold"><Icon className="text-sky-300" size={18} />{title}</div><p className="mt-2 text-sm text-zinc-400">{description}</p><div className="mt-4 rounded-md border border-dashed border-white/15 p-4 text-sm text-zinc-500">Nenhuma restrição específica configurada.</div></SettingsPanel>;
}
