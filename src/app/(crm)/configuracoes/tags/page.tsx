'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SaveNotice, SettingsPageHeader, SettingsPanel, settingsInputClass } from '@/components/settings/SettingsUI';

type TagItem = { id: string; name: string; description: string | null; color: string; created_at: string };
const colors = ['#4ade80', '#fb923c', '#fda4af', '#7dd3fc', '#c4b5fd'];

export default function TagsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [tags, setTags] = useState<TagItem[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadTags() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    const { data: membership } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (!membership) return setLoading(false);
    setTenantId(membership.tenant_id);
    const { data, error: loadError } = await supabase.from('tags').select('id,name,description,color,created_at').eq('tenant_id', membership.tenant_id).order('created_at');
    if (loadError) setError(loadError.message);
    setTags(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTags();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? tags.filter((tag) => `${tag.name} ${tag.description ?? ''}`.toLowerCase().includes(query)) : tags;
  }, [search, tags]);

  async function createTag(e: FormEvent) {
    e.preventDefault();
    if (!tenantId || !name.trim()) return;
    setSaving(true); setError(''); setMessage('');
    const { data, error: insertError } = await supabase.from('tags').insert({ tenant_id: tenantId, name: name.trim(), description: description.trim() || null, color }).select('id,name,description,color,created_at').single();
    setSaving(false);
    if (insertError || !data) return setError(insertError?.message ?? 'Não foi possível criar a tag.');
    setTags((current) => [...current, data]); setName(''); setDescription(''); setShowForm(false); setMessage('Tag criada.');
  }

  async function renameTag(tag: TagItem) {
    const nextName = window.prompt('Novo nome da tag:', tag.name)?.trim();
    if (!nextName || nextName === tag.name) return;
    const { error: updateError } = await supabase.from('tags').update({ name: nextName }).eq('id', tag.id);
    if (updateError) return setError(updateError.message);
    setTags((current) => current.map((item) => item.id === tag.id ? { ...item, name: nextName } : item));
  }

  async function deleteTag(tag: TagItem) {
    if (!window.confirm(`Excluir a tag "${tag.name}"?`)) return;
    const { error: deleteError } = await supabase.from('tags').delete().eq('id', tag.id);
    if (deleteError) return setError(deleteError.message);
    setTags((current) => current.filter((item) => item.id !== tag.id));
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 animate-spin" size={20} /> Carregando tags...</div>;

  return (
    <div>
      <SettingsPageHeader title="Tags" description="Organize suas ideias e leads com tags." action={<button onClick={() => setShowForm((value) => !value)} className="flex items-center gap-2 rounded-md bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950"><Plus size={16} /> Criar</button>} />
      <SaveNotice message={message} error={error} />
      {showForm && <SettingsPanel className="mb-4 p-5"><form onSubmit={createTag} className="grid gap-3 md:grid-cols-[1fr_1.3fr_auto_auto]"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da tag" className={settingsInputClass} /><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" className={settingsInputClass} /><select value={color} onChange={(e) => setColor(e.target.value)} className={settingsInputClass}>{colors.map((item) => <option key={item} value={item}>{item}</option>)}</select><button disabled={saving || !name.trim()} className="rounded-md bg-sky-300 px-5 text-sm font-semibold text-zinc-950 disabled:opacity-50">Salvar</button></form></SettingsPanel>}

      <div className="mb-3 flex items-center gap-3"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-md border border-white/20 bg-[#1d1e1c] py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-300" /></div><span className="text-sm text-zinc-400">{filtered.length} resultados</span><MoreVertical className="ml-auto text-zinc-500" /></div>
      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[1fr_1fr_160px_80px] gap-3 bg-[#1f201e] px-5 py-2 text-xs text-zinc-400"><div>Tags</div><div>Descrição</div><div>Data de criação</div><div /></div>
        {filtered.map((tag) => <div key={tag.id} className="grid grid-cols-[1fr_1fr_160px_80px] items-center gap-3 border-t border-white/10 bg-[#1f201e] px-5 py-4 text-sm"><div className="flex items-center gap-2 font-semibold"><span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}</div><div className="truncate text-zinc-400">{tag.description || '—'}</div><div className="text-zinc-400">{new Date(tag.created_at).toLocaleDateString('pt-BR')}</div><div className="flex justify-end gap-2"><button onClick={() => renameTag(tag)} className="text-zinc-400 hover:text-white"><Pencil size={16} /></button><button onClick={() => deleteTag(tag)} className="text-zinc-400 hover:text-red-300"><Trash2 size={16} /></button></div></div>)}
        {!filtered.length && <div className="bg-[#1f201e] p-10 text-center text-sm text-zinc-500">Nenhuma tag encontrada.</div>}
      </div>
    </div>
  );
}
