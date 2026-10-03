'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Building2, CalendarDays, Loader2, MapPin, Save, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InitialAvatar, SaveNotice, SettingsPanel, settingsInputClass } from '@/components/settings/SettingsUI';

type CompanyForm = {
  name: string;
  legalName: string;
  phone: string;
  email: string;
  segment: string;
  segmentDetail: string;
  timezone: string;
  country: string;
  document: string;
  postalCode: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

const emptyCompany: CompanyForm = {
  name: '', legalName: '', phone: '', email: '', segment: 'Outros', segmentDetail: '', timezone: 'America/Sao_Paulo',
  country: 'Brasil', document: '', postalCode: '', address: '', number: '', complement: '', district: '', city: '', state: '',
};

export default function EmpresaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [form, setForm] = useState<CompanyForm>(emptyCompany);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadCompany() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data: membership } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (!membership) return setLoading(false);
    setTenantId(membership.tenant_id);

    const [{ data: tenant }, { data: settings }] = await Promise.all([
      supabase.from('tenants').select('name,created_at').eq('id', membership.tenant_id).single(),
      supabase.from('tenant_settings').select('*').eq('tenant_id', membership.tenant_id).maybeSingle(),
    ]);

    setCreatedAt(tenant?.created_at ?? '');
    setForm({
      name: tenant?.name ?? '',
      legalName: settings?.legal_name ?? tenant?.name ?? '',
      phone: settings?.phone ?? '',
      email: settings?.email ?? user.email ?? '',
      segment: settings?.segment ?? 'Outros',
      segmentDetail: settings?.segment_detail ?? '',
      timezone: settings?.timezone ?? 'America/Sao_Paulo',
      country: settings?.country ?? 'Brasil',
      document: settings?.document ?? '',
      postalCode: settings?.postal_code ?? '',
      address: settings?.address ?? '',
      number: settings?.number ?? '',
      complement: settings?.complement ?? '',
      district: settings?.district ?? '',
      city: settings?.city ?? '',
      state: settings?.state ?? '',
    });
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCompany();
  }, []);

  function update<K extends keyof CompanyForm>(field: K, value: CompanyForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveCompany(e: FormEvent) {
    e.preventDefault();
    if (!tenantId || !form.name.trim()) return;
    setSaving(true);
    setMessage('');
    setError('');

    const { error: tenantError } = await supabase.from('tenants').update({ name: form.name.trim() }).eq('id', tenantId);
    const { error: settingsError } = await supabase.from('tenant_settings').upsert({
      tenant_id: tenantId,
      legal_name: form.legalName,
      phone: form.phone,
      email: form.email,
      segment: form.segment,
      segment_detail: form.segmentDetail,
      timezone: form.timezone,
      country: form.country,
      document: form.document,
      postal_code: form.postalCode,
      address: form.address,
      number: form.number,
      complement: form.complement,
      district: form.district,
      city: form.city,
      state: form.state,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' });
    setSaving(false);

    if (tenantError || settingsError) {
      setError(tenantError?.message ?? settingsError?.message ?? 'Não foi possível salvar a empresa.');
      return;
    }

    window.dispatchEvent(new CustomEvent('z10:tenant-name', { detail: form.name.trim() }));
    setMessage('Dados da empresa atualizados.');
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 animate-spin" size={20} /> Carregando empresa...</div>;

  return (
    <form onSubmit={saveCompany} className="space-y-4">
      <SaveNotice message={message} error={error} />
      <SettingsPanel className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <InitialAvatar name={form.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{form.name || 'Sua empresa'}</h1>
          <p className="mt-1 text-sm text-zinc-400">{form.email || 'Complete os dados da empresa'}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
            {createdAt && <span className="flex items-center gap-1"><CalendarDays size={13} /> {new Date(createdAt).toLocaleDateString('pt-BR')}</span>}
            {form.city && <span className="flex items-center gap-1"><MapPin size={13} /> {form.city}, {form.state}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm"><Building2 size={16} /> Empresa</div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="grid gap-8 border-b border-white/15 p-6 lg:grid-cols-[minmax(220px,1fr)_minmax(420px,1.3fr)]">
          <SectionIntro title="Informações" description="Principais informações sobre sua empresa." />
          <div className="space-y-4">
            <Field label="Nome de exibição"><input value={form.name} onChange={(e) => update('name', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="Razão social"><input value={form.legalName} onChange={(e) => update('legalName', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="Telefone"><input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+55" className={settingsInputClass} /></Field>
            <Field label="E-mail da empresa"><input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" className={settingsInputClass} /></Field>
            <Field label="Segmento"><select value={form.segment} onChange={(e) => update('segment', e.target.value)} className={settingsInputClass}><option>Outros</option><option>Marketing</option><option>Imobiliário</option><option>Educação</option><option>Serviços financeiros</option><option>Varejo</option></select></Field>
            <Field label="Qual é o seu segmento?"><input value={form.segmentDetail} onChange={(e) => update('segmentDetail', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="Fuso horário"><select value={form.timezone} onChange={(e) => update('timezone', e.target.value)} className={settingsInputClass}><option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option><option value="America/Manaus">America/Manaus (AMT)</option></select></Field>
          </div>
        </div>

        <div className="grid gap-8 border-b border-white/15 p-6 lg:grid-cols-[minmax(220px,1fr)_minmax(420px,1.3fr)]">
          <SectionIntro title="Logo da empresa" description="Personalize a identidade visual da organização." />
          <div className="flex items-center gap-5"><InitialAvatar name={form.name} /><button type="button" disabled className="flex min-h-20 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-white/20 text-sm text-zinc-400"><UploadCloud size={18} /> Upload em breve</button></div>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(220px,1fr)_minmax(420px,1.3fr)]">
          <SectionIntro title="Endereço" description="Endereço completo da sua empresa." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="País"><input value={form.country} onChange={(e) => update('country', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="CNPJ ou CPF"><input value={form.document} onChange={(e) => update('document', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="CEP"><input value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} className={settingsInputClass} /></Field><div />
            <div className="sm:col-span-2"><Field label="Endereço"><input value={form.address} onChange={(e) => update('address', e.target.value)} className={settingsInputClass} /></Field></div>
            <Field label="Número"><input value={form.number} onChange={(e) => update('number', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="Complemento"><input value={form.complement} onChange={(e) => update('complement', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="Bairro"><input value={form.district} onChange={(e) => update('district', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="Cidade"><input value={form.city} onChange={(e) => update('city', e.target.value)} className={settingsInputClass} /></Field>
            <Field label="UF"><input value={form.state} onChange={(e) => update('state', e.target.value.toUpperCase().slice(0, 2))} className={settingsInputClass} /></Field>
          </div>
        </div>

        <div className="flex justify-end border-t border-white/15 p-5">
          <button disabled={saving || !form.name.trim()} className="flex items-center gap-2 rounded-md bg-sky-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-sky-200 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar</button>
        </div>
      </SettingsPanel>
    </form>
  );
}

function SectionIntro({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-sm text-zinc-400">{description}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm text-zinc-200">{label}</span>{children}</label>;
}
