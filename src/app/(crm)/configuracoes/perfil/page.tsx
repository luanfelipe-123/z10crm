'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Loader2, LogOut, Save, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InitialAvatar, SaveNotice, SettingsPanel, settingsInputClass } from '@/components/settings/SettingsUI';

type Company = { id: string; name: string };

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [createdAt, setCreatedAt] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadProfile() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError('Não foi possível carregar o perfil.');
      setLoading(false);
      return;
    }

    setName(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuário');
    setEmail(user.email ?? '');
    setPhone(user.user_metadata?.phone ?? '');
    setTimezone(user.user_metadata?.timezone ?? 'America/Sao_Paulo');
    setCreatedAt(user.created_at);

    const { data: memberships } = await supabase
      .from('memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('active', true);

    const tenantIds = (memberships ?? []).map((membership) => membership.tenant_id);
    if (tenantIds.length) {
      const { data: tenants } = await supabase.from('tenants').select('id,name').in('id', tenantIds);
      setCompanies(tenants ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: name.trim(), phone: phone.trim(), timezone },
    });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage('Perfil atualizado com sucesso.');
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 animate-spin" size={20} /> Carregando perfil...</div>;
  }

  return (
    <div className="space-y-4">
      <SaveNotice message={message} error={error} />

      <SettingsPanel className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <InitialAvatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{name}</h1>
          <p className="mt-1 text-sm text-zinc-400">{email}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <CalendarDays size={14} />
            Desde {new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button onClick={logout} className="flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm hover:bg-white/5">
          <LogOut size={16} /> Sair
        </button>
      </SettingsPanel>

      <SettingsPanel>
        <form onSubmit={saveProfile} className="grid gap-8 p-6 lg:grid-cols-[minmax(220px,1fr)_minmax(360px,1.2fr)]">
          <div>
            <h2 className="text-sm font-semibold">Informações</h2>
            <p className="mt-1 text-sm text-zinc-400">Seus dados de cadastro e login.</p>
          </div>
          <div className="space-y-4">
            <Field label="Nome"><input value={name} onChange={(e) => setName(e.target.value)} className={settingsInputClass} /></Field>
            <Field label="Telefone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55" className={settingsInputClass} /></Field>
            <Field label="Fuso horário">
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={settingsInputClass}>
                <option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option>
                <option value="America/Manaus">America/Manaus (AMT)</option>
                <option value="America/Rio_Branco">America/Rio_Branco (ACT)</option>
              </select>
            </Field>
            <Field label="E-mail"><input value={email} disabled className={`${settingsInputClass} cursor-not-allowed opacity-60`} /></Field>
            <button disabled className="w-full cursor-not-allowed rounded-md border border-white/20 px-4 py-2.5 text-sm text-zinc-400">Alterar senha pelo Supabase</button>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Imagem de perfil</h2>
            <p className="mt-1 text-sm text-zinc-400">Personalize como seu perfil aparece.</p>
          </div>
          <div className="flex items-center gap-5">
            <InitialAvatar name={name} />
            <button type="button" disabled className="flex min-h-20 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-white/20 text-sm text-zinc-400">
              <UploadCloud size={18} /> Upload disponível em breve
            </button>
          </div>

          <div />
          <div className="flex justify-end">
            <button disabled={saving || !name.trim()} className="flex items-center gap-2 rounded-md bg-sky-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-sky-200 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar
            </button>
          </div>
        </form>
      </SettingsPanel>

      <SettingsPanel className="grid gap-8 p-6 lg:grid-cols-[minmax(220px,1fr)_minmax(360px,1.2fr)]">
        <div>
          <h2 className="text-sm font-semibold">Preferências</h2>
          <p className="mt-1 text-sm text-zinc-400">Personalize a aparência e a segurança.</p>
        </div>
        <div className="space-y-5">
          <Field label="Tema"><select className={settingsInputClass}><option>Escuro</option></select></Field>
          <PreferenceToggle title="Verificação em duas etapas" description="Será habilitada em uma próxima etapa." />
          <PreferenceToggle title="Modo privacidade" description="Ocultar informações sensíveis na tela." />
        </div>
      </SettingsPanel>

      <SettingsPanel className="p-6">
        <h2 className="text-sm font-semibold">Empresas</h2>
        <p className="mt-1 text-sm text-zinc-400">Empresas que você possui ou participa.</p>
        <div className="mt-4 overflow-hidden rounded-md border border-white/15">
          <div className="bg-black/20 px-4 py-2 text-xs text-zinc-400">Nome</div>
          {companies.map((company) => (
            <div key={company.id} className="flex items-center gap-3 border-t border-white/10 px-4 py-3 text-sm">
              <InitialAvatar name={company.name} size="sm" />
              <span className="font-medium text-sky-300">{company.name}</span>
            </div>
          ))}
        </div>
      </SettingsPanel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm text-zinc-200">{label}</span>{children}</label>;
}

function PreferenceToggle({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><div className="text-sm font-medium">{title}</div><div className="mt-1 text-xs text-zinc-500">{description}</div></div>
      <button disabled className="relative h-6 w-10 cursor-not-allowed rounded-full bg-zinc-600"><span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-zinc-900" /></button>
    </div>
  );
}
