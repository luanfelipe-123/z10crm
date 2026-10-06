'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Copy, GripVertical, Loader2, Palette, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import { createField, fieldCatalog, type CrmForm, type FormField, type FormFieldType, normalizeSettings, type FormSettings, slugify } from '@/lib/forms';
import { supabase } from '@/lib/supabase';

type FieldRow = { id: string; field_type: FormFieldType; label: string; placeholder: string | null; help_text: string | null; required: boolean; position: number; options: unknown; config: { allowMultiple?: boolean; autoAdvance?: boolean } | null };
type Tab = 'fields' | 'design' | 'options';

function mapField(row: FieldRow): FormField {
  return { id: row.id, type: row.field_type, label: row.label, placeholder: row.placeholder ?? '', helpText: row.help_text ?? '', required: row.required, position: row.position, options: Array.isArray(row.options) ? row.options.filter((item): item is string => typeof item === 'string') : [], allowMultiple: Boolean(row.config?.allowMultiple), autoAdvance: Boolean(row.config?.autoAdvance) };
}

export default function FormEditor({ formId }: { formId: string }) {
  const [form, setForm] = useState<CrmForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('fields');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dragged, setDragged] = useState<string | null>(null);

  const selected = fields.find((field) => field.id === selectedId) ?? null;
  const publicUrl = typeof window === 'undefined' || !form ? '' : `${window.location.origin}/f/${form.slug}`;

  useEffect(() => {
    async function loadForm() {
      setLoading(true);
      const { data: formRow, error } = await supabase.from('crm_forms').select('*').eq('id', formId).maybeSingle();
      if (error || !formRow) { setMessage(error?.message ?? 'Formulário não encontrado.'); setLoading(false); return; }
      const { data: fieldRows, error: fieldError } = await supabase.from('crm_form_fields').select('*').eq('form_id', formId).order('position');
      if (fieldError) setMessage(fieldError.message);
      const loaded = (fieldRows ?? []).map((row) => mapField(row as FieldRow));
      setForm({ ...formRow, settings: normalizeSettings(formRow.settings) } as CrmForm);
      setFields(loaded);
      setSelectedId(loaded[0]?.id ?? null);
      setLoading(false);
    }
    void loadForm();
  }, [formId]);

  function addField(type: FormFieldType) {
    const field = createField(type, fields.length);
    setFields((current) => [...current, field]);
    setSelectedId(field.id);
  }

  function updateField(id: string, patch: Partial<FormField>) { setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field)); }
  function removeField(id: string) { setFields((current) => current.filter((field) => field.id !== id).map((field, position) => ({ ...field, position }))); setSelectedId((current) => current === id ? null : current); }
  function moveField(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    setFields((current) => { const from = current.findIndex((item) => item.id === sourceId); const to = current.findIndex((item) => item.id === targetId); if (from < 0 || to < 0) return current; const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next.map((field, position) => ({ ...field, position })); });
  }

  function changeSettings(patch: Partial<FormSettings>) { setForm((current) => current ? { ...current, settings: { ...current.settings, ...patch } } : current); }
  function changeAvailability(patch: Partial<FormSettings['availability']>) { setForm((current) => current ? { ...current, settings: { ...current.settings, availability: { ...current.settings.availability, ...patch } } } : current); }

  async function save(publish?: boolean) {
    if (!form) return;
    setSaving(true); setMessage('');
    const cleanedSlug = slugify(form.slug || form.name);
    const { error: formError } = await supabase.from('crm_forms').update({ name: form.name.trim() || 'Novo formulário', slug: cleanedSlug, status: publish ? 'published' : form.status, settings: form.settings, updated_at: new Date().toISOString() }).eq('id', form.id);
    if (formError) { setSaving(false); return setMessage(formError.message); }
    const { error: deleteError } = await supabase.from('crm_form_fields').delete().eq('form_id', form.id);
    if (deleteError) { setSaving(false); return setMessage(deleteError.message); }
    if (fields.length) {
      const { error: insertError } = await supabase.from('crm_form_fields').insert(fields.map((field, position) => ({ id: field.id, form_id: form.id, field_type: field.type, label: field.label.trim() || 'Nova pergunta', placeholder: field.placeholder || null, help_text: field.helpText || null, required: field.required, position, options: field.options, config: { allowMultiple: Boolean(field.allowMultiple), autoAdvance: Boolean(field.autoAdvance) } })));
      if (insertError) { setSaving(false); return setMessage(insertError.message); }
    }
    setForm((current) => current ? { ...current, slug: cleanedSlug, status: publish ? 'published' : current.status, updated_at: new Date().toISOString() } : current);
    setSaving(false); setMessage(publish ? 'Formulário publicado. O link público está pronto.' : 'Alterações salvas.');
  }

  async function copyLink() { if (!publicUrl) return; await navigator.clipboard.writeText(publicUrl); setMessage('Link público copiado.'); }

  if (loading) return <div className="form-loading"><Loader2 className="animate-spin" size={20}/> Carregando editor...</div>;
  if (!form) return <div className="form-empty"><p>{message || 'Formulário não encontrado.'}</p><Link href="/formularios" className="form-secondary-button">Voltar para formulários</Link></div>;

  return <div className="form-editor-page">
    <header className="form-editor-header"><Link href="/formularios" className="form-back"><ArrowLeft size={18}/></Link><input className="form-title-input" aria-label="Nome do formulário" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/><div className="form-editor-header__actions"><button onClick={() => void save()} disabled={saving} className="form-secondary-button"><Save size={16}/>{saving ? 'Salvando...' : 'Salvar'}</button><button onClick={() => void save(true)} disabled={saving || !fields.length} className="form-primary-button"><Check size={16}/>{form.status === 'published' ? 'Atualizar publicado' : 'Publicar'}</button></div></header>
    {message && <div className="form-notice form-notice--editor">{message}{form.status === 'published' && <button onClick={() => void copyLink()}><Copy size={15}/> Copiar link</button>}</div>}
    <div className="form-editor-layout">
      <aside className="form-toolbox"><div className="form-tabs"><button className={tab === 'fields' ? 'is-active' : ''} onClick={() => setTab('fields')}>Campos</button><button className={tab === 'design' ? 'is-active' : ''} onClick={() => setTab('design')}><Palette size={15}/> Design</button><button className={tab === 'options' ? 'is-active' : ''} onClick={() => setTab('options')}><Settings2 size={15}/> Opções</button></div>
        {tab === 'fields' && <div className="form-toolbox-body"><h2>Adicionar campo</h2><div className="form-field-catalog">{fieldCatalog.map((item) => <button key={item.type} onClick={() => addField(item.type)}><Plus size={15}/>{item.label}</button>)}</div></div>}
        {tab === 'design' && <div className="form-toolbox-body"><h2>Apresentação</h2><label>Modo de exibição<select value={form.settings.layout} onChange={(event) => changeSettings({ layout: event.target.value as FormSettings['layout'] })}><option value="single">Todas as perguntas em uma tela</option><option value="steps">Uma pergunta por tela</option></select></label><p className="form-helper">O formulário público respeita este modo. Agendamento sempre aparece na última etapa.</p></div>}
        {tab === 'options' && <div className="form-toolbox-body"><h2>Comportamento</h2><Toggle label="Tela de boas-vindas" checked={form.settings.showWelcome} onChange={(showWelcome) => changeSettings({ showWelcome })}/><Toggle label="Barra de progresso" checked={form.settings.showProgress} onChange={(showProgress) => changeSettings({ showProgress })}/><label>Texto do botão Continuar<input value={form.settings.continueLabel} onChange={(event) => changeSettings({ continueLabel: event.target.value })}/></label><label>Texto do botão Finalizar<input value={form.settings.submitLabel} onChange={(event) => changeSettings({ submitLabel: event.target.value })}/></label><label>Mensagem de sucesso<textarea value={form.settings.successMessage} onChange={(event) => changeSettings({ successMessage: event.target.value })}/></label><label>Redirecionar após envio (opcional)<input type="url" value={form.settings.redirectUrl ?? ''} onChange={(event) => changeSettings({ redirectUrl: event.target.value })}/></label><hr/><h2>Agendamento</h2><label>Início<select value={form.settings.availability.startHour} onChange={(event) => changeAvailability({ startHour: Number(event.target.value) })}>{hours.map((hour) => <option key={hour} value={hour}>{`${String(hour).padStart(2, '0')}:00`}</option>)}</select></label><label>Fim<select value={form.settings.availability.endHour} onChange={(event) => changeAvailability({ endHour: Number(event.target.value) })}>{hours.map((hour) => <option key={hour} value={hour}>{`${String(hour).padStart(2, '0')}:00`}</option>)}</select></label><label>Intervalo<select value={form.settings.availability.intervalMinutes} onChange={(event) => changeAvailability({ intervalMinutes: Number(event.target.value) })}><option value={30}>30 minutos</option><option value={60}>60 minutos</option><option value={90}>90 minutos</option></select></label><div><span className="form-label">Dias disponíveis</span><div className="weekday-list">{weekdays.map((item) => <label key={item.value}><input type="checkbox" checked={form.settings.availability.weekdays.includes(item.value)} onChange={(event) => changeAvailability({ weekdays: event.target.checked ? [...form.settings.availability.weekdays, item.value].sort() : form.settings.availability.weekdays.filter((day) => day !== item.value) })}/>{item.label}</label>)}</div></div><hr/><h2>Integrações por formulário</h2><label>ID do Pixel da Meta<input value={form.settings.pixelId ?? ''} onChange={(event) => changeSettings({ pixelId: event.target.value.trim() })} placeholder="123456789012345"/></label><label>Token da API de Conversões<input type="password" value={form.settings.capiToken ?? ''} onChange={(event) => changeSettings({ capiToken: event.target.value.trim() })} placeholder="Opcional"/></label><label>Código de teste da Meta<input value={form.settings.metaTestEventCode ?? ''} onChange={(event) => changeSettings({ metaTestEventCode: event.target.value.trim() })} placeholder="TEST12345"/></label><label>Webhook de saída<input type="url" value={form.settings.webhookUrl ?? ''} onChange={(event) => changeSettings({ webhookUrl: event.target.value.trim() })} placeholder="https://..."/></label><p className="form-helper">O webhook recebe os dados no envio. Com agendamento, a Meta recebe os eventos <strong>Schedule</strong> e <strong>Agendamento</strong>.</p></div>}
      </aside>
      <main className="form-builder-canvas"><div className="form-preview"><div className="form-preview__header"><span>Prévia do formulário</span><span>{fields.length} campo{fields.length === 1 ? '' : 's'}</span></div>{!fields.length ? <div className="form-preview__empty"><Plus size={25}/><p>Adicione o primeiro campo pelo painel à esquerda.</p></div> : fields.map((field) => <FieldPreview key={field.id} field={field} active={selectedId === field.id} onSelect={() => setSelectedId(field.id)} onDragStart={() => setDragged(field.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged) moveField(dragged, field.id); setDragged(null); }} />)}<button className="form-preview__submit">{form.settings.submitLabel}</button></div></main>
      <aside className="form-properties">{selected ? <FieldProperties field={selected} onChange={(patch) => updateField(selected.id, patch)} onDelete={() => removeField(selected.id)}/> : <div className="form-properties__empty">Selecione um campo para editar suas propriedades.</div>}</aside>
    </div>
  </div>;
}

function FieldPreview({ field, active, onSelect, onDragStart, onDragOver, onDrop }: { field: FormField; active: boolean; onSelect: () => void; onDragStart: () => void; onDragOver: (event: DragEvent<HTMLDivElement>) => void; onDrop: () => void }) {
  return <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onClick={onSelect} className={`form-preview-field ${active ? 'is-active' : ''}`}><button className="form-drag-handle" aria-label="Arraste para reordenar" onClick={(event) => event.stopPropagation()}><GripVertical size={17}/></button><label>{field.label}{field.required && <span> *</span>}</label>{field.helpText && <small>{field.helpText}</small>}{renderPreviewInput(field)}</div>;
}

function renderPreviewInput(field: FormField) {
  if (field.type === 'long_text') return <textarea placeholder={field.placeholder} readOnly/>;
  if (field.type === 'select') return <div className="form-preview-select">{field.placeholder || 'Escolha uma opção'} <ChevronDown size={16}/></div>;
  if (field.type === 'radio' || field.type === 'checkbox') return <div className="form-preview-options">{field.options.map((option) => <div key={option}><span className={field.type === 'checkbox' ? 'preview-checkbox' : 'preview-radio'}/>{option}</div>)}</div>;
  if (field.type === 'booking') return <div className="booking-preview"><strong>Agendamento</strong><div><input readOnly placeholder="Selecione uma data"/><button>Ver horários</button></div><small>As datas e horários disponíveis aparecem no formulário publicado.</small></div>;
  return <input readOnly type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'} placeholder={field.placeholder}/>;
}

function FieldProperties({ field, onChange, onDelete }: { field: FormField; onChange: (patch: Partial<FormField>) => void; onDelete: () => void }) {
  return <div className="form-properties__body"><div className="form-properties__type">CAMPO: {fieldCatalog.find((item) => item.type === field.type)?.label.toUpperCase()}</div><label>Título da pergunta<input value={field.label} onChange={(event) => onChange({ label: event.target.value })}/></label>{!['radio', 'checkbox'].includes(field.type) && <label>Placeholder<input value={field.placeholder} onChange={(event) => onChange({ placeholder: event.target.value })}/></label>}<label>Descrição / Ajuda<textarea value={field.helpText ?? ''} onChange={(event) => onChange({ helpText: event.target.value })}/></label>{['select', 'radio', 'checkbox'].includes(field.type) && <OptionEditor field={field} onChange={onChange}/>}<Toggle label="Resposta obrigatória" checked={field.required} onChange={(required) => onChange({ required })}/>{field.type === 'radio' && <><Toggle label="Permitir várias opções" checked={Boolean(field.allowMultiple)} onChange={(allowMultiple) => onChange({ allowMultiple })}/><Toggle label="Avançar ao escolher resposta" checked={Boolean(field.autoAdvance)} onChange={(autoAdvance) => onChange({ autoAdvance })}/></>}<button onClick={onDelete} className="form-delete-button"><Trash2 size={16}/> Excluir campo</button></div>;
}

function OptionEditor({ field, onChange }: { field: FormField; onChange: (patch: Partial<FormField>) => void }) { const options = field.options; function update(index: number, value: string) { onChange({ options: options.map((option, current) => current === index ? value : option) }); } return <div className="form-option-editor"><span className="form-label">Opções</span>{options.map((option, index) => <div key={`${option}-${index}`}><input value={option} onChange={(event) => update(index, event.target.value)}/><button type="button" onClick={() => onChange({ options: options.filter((_, current) => current !== index) })}><Trash2 size={14}/></button></div>)}<button type="button" className="form-add-option" onClick={() => onChange({ options: [...options, `Opção ${options.length + 1}`] })}><Plus size={14}/> Adicionar opção</button></div>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="form-toggle"><input type="checkbox" checked={checked} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}/><span>{label}</span></label>; }
const hours = Array.from({ length: 24 }, (_, index) => index);
const weekdays = [{ value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' }, { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' }];
