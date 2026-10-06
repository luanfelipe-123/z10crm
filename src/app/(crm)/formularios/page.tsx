'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClipboardList, Copy, ExternalLink, FilePlus2, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type CrmForm, defaultSettings, slugify } from '@/lib/forms';

export default function FormulariosPage() {
  const [forms, setForms] = useState<CrmForm[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    setUserId(user.id);
    const { data: membership, error } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (error || !membership) { setMessage(error?.message ?? 'Não foi possível identificar a empresa.'); return setLoading(false); }
    setTenantId(membership.tenant_id);
    const { data, error: formsError } = await supabase.from('crm_forms').select('*').eq('tenant_id', membership.tenant_id).order('updated_at', { ascending: false });
    if (formsError) setMessage(formsError.message);
    setForms((data ?? []).map((form) => ({ ...form, settings: { ...defaultSettings, ...(form.settings ?? {}) } })) as CrmForm[]);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function create() {
    if (!tenantId || !userId) return;
    setCreating(true); setMessage('');
    const unique = `${slugify('novo-formulario')}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await supabase.from('crm_forms').insert({ tenant_id: tenantId, created_by: userId, name: 'Novo formulário', slug: unique, settings: defaultSettings }).select('*').single();
    setCreating(false);
    if (error || !data) return setMessage(error?.message ?? 'Não foi possível criar o formulário. Execute a migração forms.sql no Supabase.');
    router.push(`/formularios/${data.id}`);
  }

  async function remove(form: CrmForm) {
    if (!window.confirm(`Excluir o formulário “${form.name}”?`)) return;
    const { error } = await supabase.from('crm_forms').delete().eq('id', form.id);
    if (error) return setMessage(error.message);
    setForms((current) => current.filter((item) => item.id !== form.id));
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage('Link copiado.');
  }

  const baseUrl = typeof window === 'undefined' ? '' : window.location.origin;
  return <div>
    <div className="page-heading"><div><div className="page-heading__eyebrow">Captação</div><h1>Formulários</h1><p>Crie formulários, receba respostas e envie cada novo contato ao seu CRM.</p></div><button disabled={creating || loading} onClick={create} className="form-primary-button"><FilePlus2 size={17}/>{creating ? 'Criando...' : 'Criar formulário'}</button></div>
    {message && <div className="form-notice">{message}</div>}
    {loading ? <div className="form-empty"><Loader2 className="animate-spin" size={20}/> Carregando formulários...</div> : forms.length === 0 ? <div className="form-empty"><ClipboardList size={30}/><h2>Comece com seu primeiro formulário</h2><p>Os dados enviados entram automaticamente como leads e negócios no pipeline.</p><button onClick={create} className="form-primary-button"><FilePlus2 size={17}/> Criar formulário</button></div> : <div className="form-grid">{forms.map((form) => { const publicUrl = `${baseUrl}/f/${form.slug}`; return <article className="form-card" key={form.id}><div className="form-card__top"><span className={`form-status form-status--${form.status}`}>{form.status === 'published' ? 'Publicado' : 'Rascunho'}</span><MoreHorizontal size={18} className="text-muted" /></div><h2>{form.name}</h2><p>Atualizado em {new Date(form.updated_at).toLocaleDateString('pt-BR')}</p><div className="form-card__link">/f/{form.slug}</div><div className="form-card__actions"><Link href={`/formularios/${form.id}`} className="form-secondary-button">Editar</Link>{form.status === 'published' && <><button onClick={() => void copy(publicUrl)} className="form-icon-action" title="Copiar link"><Copy size={16}/></button><a href={publicUrl} target="_blank" className="form-icon-action" title="Abrir formulário"><ExternalLink size={16}/></a></>}<button onClick={() => void remove(form)} className="form-icon-action form-icon-action--danger" title="Excluir"><Trash2 size={16}/></button></div></article>; })}</div>}
  </div>;
}
