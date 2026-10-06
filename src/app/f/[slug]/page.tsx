import { notFound } from 'next/navigation';
import PublicForm from '@/components/forms/PublicForm';
import { createAdminClient } from '@/lib/server/supabase-admin';
import { normalizeSettings, type FormField } from '@/lib/forms';

export const dynamic = 'force-dynamic';

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: form } = await admin.from('crm_forms').select('id,name,slug,settings').eq('slug', slug).eq('status', 'published').maybeSingle();
  if (!form) notFound();
  const { data: rows } = await admin.from('crm_form_fields').select('*').eq('form_id', form.id).order('position');
  const fields: FormField[] = (rows ?? []).map((row) => ({ id: row.id, type: row.field_type, label: row.label, placeholder: row.placeholder ?? '', helpText: row.help_text ?? '', required: row.required, position: row.position, options: Array.isArray(row.options) ? row.options : [], allowMultiple: Boolean(row.config?.allowMultiple), autoAdvance: Boolean(row.config?.autoAdvance) }));
  // The Conversion API token remains on the server. The public page only
  // receives the settings required to render the form and initialize the pixel.
  const settings = normalizeSettings(form.settings);
  settings.capiToken = '';
  return <PublicForm form={{ id: form.id, name: form.name, slug: form.slug, settings }} fields={fields}/>;
}
