'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { FormField, FormSettings } from '@/lib/forms';

type PublicFormModel = { id: string; name: string; slug: string; settings: FormSettings };

export default function PublicForm({ form, fields }: { form: PublicFormModel; fields: FormField[] }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(form.settings.showWelcome ? -1 : 0);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const booking = fields.find((field) => field.type === 'booking');
  const standardFields = fields.filter((field) => field.type !== 'booking');
  const isSteps = form.settings.layout === 'steps';
  const visible = useMemo(() => {
    if (!isSteps) return fields;
    if (step >= standardFields.length && booking) return [booking];
    return standardFields[step] ? [standardFields[step]] : [];
  }, [booking, fields, isSteps, standardFields, step]);
  const totalSteps = standardFields.length + (booking ? 1 : 0);
  const currentIndex = step < 0 ? 0 : Math.min(step + 1, totalSteps);

  useEffect(() => { if (!form.settings.pixelId || document.getElementById('z10-meta-pixel')) return; const script = document.createElement('script'); script.id = 'z10-meta-pixel'; script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script); const win = window as Window & { fbq?: (...args: unknown[]) => void }; const boot = window.setInterval(() => { if (win.fbq) { win.fbq('init', form.settings.pixelId); win.fbq('track', 'PageView'); window.clearInterval(boot); } }, 100); return () => window.clearInterval(boot); }, [form.settings.pixelId]);

  function setValue(field: FormField, value: unknown) { setAnswers((current) => ({ ...current, [field.id]: value })); }
  function validate(fieldsToValidate: FormField[]) { const missing = fieldsToValidate.find((field) => field.required && (answers[field.id] === undefined || answers[field.id] === '' || (Array.isArray(answers[field.id]) && !(answers[field.id] as unknown[]).length))); if (missing) { setError(`Preencha “${missing.label}” para continuar.`); return false; } setError(''); return true; }
  function advance() { if (!validate(visible)) return; setStep((current) => Math.min(current + 1, totalSteps - 1)); }
  function choose(field: FormField, option: string) { if (field.allowMultiple) { const current = Array.isArray(answers[field.id]) ? answers[field.id] as string[] : []; setValue(field, current.includes(option) ? current.filter((item) => item !== option) : [...current, option]); return; } setValue(field, option); if (isSteps && field.autoAdvance) window.setTimeout(advance, 120); }
  async function submit(event?: FormEvent) { event?.preventDefault(); if (!validate(fields)) return; setSending(true); setError(''); const response = await fetch(`/api/forms/${form.slug}/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, pageUrl: window.location.href, referrer: document.referrer, utm: Object.fromEntries(new URLSearchParams(window.location.search)) }) }); const body = await response.json().catch(() => ({})); setSending(false); if (!response.ok) { setError(body.error ?? 'Não foi possível enviar suas respostas.'); return; } const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq; if (fbq && form.settings.pixelId) { fbq('track', 'Lead', {}, { eventID: `${body.submissionId}:lead` }); if (booking && answers[booking.id]) { fbq('track', 'Schedule', {}, { eventID: `${body.submissionId}:schedule` }); fbq('trackCustom', 'Agendamento', {}, { eventID: `${body.submissionId}:agendamento` }); } } setSuccess(true); if (form.settings.redirectUrl) window.setTimeout(() => { window.location.href = form.settings.redirectUrl!; }, 900); }

  if (success) return <main className="public-form-shell"><section className="public-form public-form--success"><CheckCircle2 size={44}/><h1>Resposta enviada</h1><p>{form.settings.successMessage}</p>{form.settings.redirectUrl && <p className="public-form__muted">Redirecionando...</p>}</section></main>;
  if (step === -1) return <main className="public-form-shell"><section className="public-form public-form--welcome"><span className="public-form__eyebrow">{form.name}</span><h1>Vamos começar?</h1><p>Responda algumas perguntas para avançar.</p><button onClick={() => setStep(0)}>{form.settings.continueLabel}<ChevronRight size={17}/></button></section></main>;
  if (!fields.length) return <main className="public-form-shell"><section className="public-form public-form--welcome"><h1>Formulário em preparação</h1><p>Este formulário ainda não possui perguntas.</p></section></main>;

  return <main className="public-form-shell"><form className="public-form" onSubmit={submit}>{form.settings.showProgress && <div className="public-progress"><span>{isSteps ? `${currentIndex} de ${totalSteps}` : `${fields.length} pergunta${fields.length > 1 ? 's' : ''}`}</span><i style={{ width: `${isSteps ? Math.max(8, currentIndex / totalSteps * 100) : 100}%` }}/></div>}<h1>{form.name}</h1>{visible.map((field) => <PublicField key={field.id} field={field} value={answers[field.id]} setValue={(value) => setValue(field, value)} choose={(option) => choose(field, option)} settings={form.settings}/>) }{error && <p className="public-form__error">{error}</p>}<div className="public-form__actions">{isSteps && step > 0 && <button type="button" onClick={() => setStep((current) => current - 1)} className="public-form__back"><ChevronLeft size={17}/> Voltar</button>}{isSteps && step < totalSteps - 1 ? <button type="button" onClick={advance}>{form.settings.continueLabel}<ChevronRight size={17}/></button> : <button disabled={sending} type="submit">{sending ? <Loader2 className="animate-spin" size={17}/> : null}{sending ? 'Enviando...' : form.settings.submitLabel}</button>}</div></form></main>;
}

function PublicField({ field, value, setValue, choose, settings }: { field: FormField; value: unknown; setValue: (value: unknown) => void; choose: (option: string) => void; settings: FormSettings }) {
  if (field.type === 'booking') return <BookingField field={field} value={value as { date?: string; time?: string } | undefined} setValue={setValue} settings={settings}/>;
  const shared = <><label>{field.label}{field.required && <em> *</em>}</label>{field.helpText && <small>{field.helpText}</small>}</>;
  if (field.type === 'long_text') return <section className="public-field">{shared}<textarea value={String(value ?? '')} onChange={(event) => setValue(event.target.value)} placeholder={field.placeholder}/></section>;
  if (field.type === 'select') return <section className="public-field">{shared}<select value={String(value ?? '')} onChange={(event) => setValue(event.target.value)}><option value="">{field.placeholder || 'Selecione'}</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select></section>;
  if (field.type === 'radio' || field.type === 'checkbox') { const many = field.type === 'checkbox' || field.allowMultiple; const selected = Array.isArray(value) ? value as string[] : []; return <section className="public-field">{shared}<div className="public-options">{field.options.map((option) => <label key={option}><input type={many ? 'checkbox' : 'radio'} name={field.id} checked={many ? selected.includes(option) : value === option} onChange={() => choose(option)}/><span>{option}</span></label>)}</div></section>; }
  const type = field.type === 'whatsapp' ? 'tel' : field.type;
  return <section className="public-field">{shared}<input type={type} value={String(value ?? '')} onChange={(event) => setValue(event.target.value)} placeholder={field.placeholder}/></section>;
}

function BookingField({ field, value, setValue, settings }: { field: FormField; value?: { date?: string; time?: string }; setValue: (value: unknown) => void; settings: FormSettings }) { const date = value?.date ?? ''; const slots = date ? availableSlots(settings) : []; return <section className="public-field public-booking"><label>{field.label}{field.required && <em> *</em>}</label><small>{field.helpText || 'Escolha primeiro uma data e depois um horário disponível.'}</small><div className="public-booking__date"><CalendarDays size={18}/><input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setValue({ date: event.target.value, time: '' })}/></div>{date && !isAvailableDay(date, settings) && <p className="public-form__error">Não há horários disponíveis nesta data.</p>}{slots.length > 0 && <div className="public-booking__slots">{slots.map((slot) => <button type="button" key={slot} onClick={() => setValue({ date, time: slot })} className={value?.time === slot ? 'is-selected' : ''}>{slot}</button>)}</div>}</section>; }
function isAvailableDay(value: string, settings: FormSettings) { return settings.availability.weekdays.includes(new Date(`${value}T12:00:00`).getDay()); }
function availableSlots(settings: FormSettings) { const slots: string[] = []; const { startHour, endHour, intervalMinutes } = settings.availability; for (let minute = startHour * 60; minute < endHour * 60; minute += intervalMinutes) slots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`); return slots; }
