import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FieldRow = { id: string; field_type: string; label: string; required: boolean; config: { allowMultiple?: boolean } | null };
const hash = (value: unknown) => createHash('sha256').update(String(value ?? '').trim().toLowerCase()).digest('hex');

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json() as { answers?: Record<string, unknown>; pageUrl?: string; referrer?: string; utm?: Record<string, string> };
    const answers = body.answers ?? {};
    const admin = createAdminClient();
    const { data: form, error: formError } = await admin.from('crm_forms').select('id,tenant_id,created_by,name,settings').eq('slug', slug).eq('status', 'published').maybeSingle();
    if (formError) throw formError;
    if (!form) return Response.json({ error: 'Formulário não encontrado.' }, { status: 404 });
    const { data: fields, error: fieldsError } = await admin.from('crm_form_fields').select('id,field_type,label,required,config').eq('form_id', form.id).order('position');
    if (fieldsError) throw fieldsError;
    const rows = (fields ?? []) as FieldRow[];
    const required = rows.find((field) => field.required && (answers[field.id] === undefined || answers[field.id] === '' || (Array.isArray(answers[field.id]) && !(answers[field.id] as unknown[]).length)));
    if (required) return Response.json({ error: `Preencha “${required.label}”.` }, { status: 400 });
    const named = rows.map((field) => ({ field, value: answers[field.id] }));
    const get = (type: string, keywords: string[]) => named.find(({ field }) => field.field_type === type)?.value ?? named.find(({ field }) => keywords.some((word) => field.label.toLowerCase().includes(word)))?.value;
    const name = String(get('text', ['nome', 'name']) ?? 'Novo lead').slice(0, 180);
    const email = String(get('email', ['email', 'e-mail']) ?? '');
    const phone = String(get('whatsapp', ['whatsapp', 'telefone', 'celular']) ?? '');
    const booking = named.find(({ field }) => field.field_type === 'booking')?.value as { date?: string; time?: string } | undefined;
    const metadata = { page_url: body.pageUrl ?? null, referrer: body.referrer ?? null, utm: body.utm ?? {}, email: email || null, phone: phone || null };
    const { data: lead, error: leadError } = await admin.from('leads').insert({ tenant_id: form.tenant_id, name, source: `Formulário: ${form.name}`, owner_id: form.created_by }).select('id,name').single();
    if (leadError) throw leadError;
    const { data: submission, error: submissionError } = await admin.from('crm_form_submissions').insert({ form_id: form.id, tenant_id: form.tenant_id, lead_id: lead.id, answers, metadata, scheduled_for: booking?.date && booking?.time ? `${booking.date}T${booking.time}:00` : null }).select('id').single();
    if (submissionError) throw submissionError;
    const { data: pipeline } = await admin.from('pipelines').select('id').eq('tenant_id', form.tenant_id).order('created_at').limit(1).maybeSingle();
    if (pipeline) { const { data: stage } = await admin.from('stages').select('id').eq('pipeline_id', pipeline.id).order('position').limit(1).maybeSingle(); if (stage) await admin.from('deals').insert({ tenant_id: form.tenant_id, lead_id: lead.id, pipeline_id: pipeline.id, stage_id: stage.id, title: name, status: 'open', owner_id: form.created_by }); }
    const settings = (form.settings ?? {}) as { pixelId?: string; capiToken?: string; metaTestEventCode?: string; webhookUrl?: string };
    const eventBase = { source_url: body.pageUrl ?? '', action_source: 'website', event_source_url: body.pageUrl ?? '', user_data: { em: email ? [hash(email)] : [], ph: phone ? [hash(phone.replace(/\D/g, ''))] : [] }, custom_data: { form_id: form.id, form_name: form.name, lead_id: lead.id, submission_id: submission.id, ...(booking?.date && booking?.time ? { scheduled_for: `${booking.date} ${booking.time}` } : {}) } };
    const deliveries: Promise<unknown>[] = [];
    if (settings.pixelId && settings.capiToken) { const events = [{ ...eventBase, event_name: 'Lead', event_time: Math.floor(Date.now() / 1000), event_id: `${submission.id}:lead` }, ...(booking?.date && booking?.time ? [{ ...eventBase, event_name: 'Schedule', event_time: Math.floor(Date.now() / 1000), event_id: `${submission.id}:schedule` }, { ...eventBase, event_name: 'Agendamento', event_time: Math.floor(Date.now() / 1000), event_id: `${submission.id}:agendamento` }] : [])]; deliveries.push(fetch(`https://graph.facebook.com/v22.0/${encodeURIComponent(settings.pixelId)}/events?access_token=${encodeURIComponent(settings.capiToken)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: events, ...(settings.metaTestEventCode ? { test_event_code: settings.metaTestEventCode } : {}) }) })); }
    if (settings.webhookUrl) deliveries.push(fetch(settings.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Z10-Event': booking?.date ? 'appointment.created' : 'form.submitted' }, body: JSON.stringify({ event: booking?.date ? 'appointment.created' : 'form.submitted', form: { id: form.id, name: form.name, slug }, submissionId: submission.id, lead: { id: lead.id, name, email, phone }, answers, booking: booking ?? null, metadata }) }));
    if (deliveries.length) await Promise.allSettled(deliveries);
    return Response.json({ ok: true, submissionId: submission.id });
  } catch (error) { const message = error instanceof Error ? error.message : 'Não foi possível enviar o formulário.'; return Response.json({ error: message }, { status: 500 }); }
}
