import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

type AutomationRow = {
  id: string;
  tenant_id: string;
  name: string;
  action_type: string;
  action_config: Record<string, unknown> | null;
};

function safeWebhookUrl(raw: unknown) {
  if (typeof raw !== 'string') throw new Error('URL da ação HTTP não configurada.');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('A URL de saída precisa usar HTTPS.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) throw new Error('Destino HTTP não permitido.');
  return url.toString();
}

export async function runAutomation(admin: SupabaseClient, automation: AutomationRow, payload: unknown, source: string) {
  const { data: execution, error: executionError } = await admin.from('automation_executions').insert({
    tenant_id: automation.tenant_id,
    automation_id: automation.id,
    status: 'running',
    trigger_payload: payload,
    started_at: new Date().toISOString(),
  }).select('id').single();
  if (executionError) throw executionError;

  try {
    let result: unknown = { accepted: true, source };
    if (automation.action_type === 'outbound_webhook') {
      const config = automation.action_config ?? {};
      const target = safeWebhookUrl(config.url);
      const method = typeof config.method === 'string' && ['POST', 'PUT', 'PATCH'].includes(config.method) ? config.method : 'POST';
      const response = await fetch(target, {
        method,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Z10-CRM-Automations/1.0' },
        body: JSON.stringify({ event: source, automation: automation.name, data: payload }),
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Webhook de saída respondeu ${response.status}: ${text.slice(0, 400)}`);
      result = { status: response.status, response: text.slice(0, 1000) };
    }

    await admin.from('automation_executions').update({ status: 'success', result, finished_at: new Date().toISOString() }).eq('id', execution.id);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na automação.';
    await admin.from('automation_executions').update({ status: 'error', error_message: message, finished_at: new Date().toISOString() }).eq('id', execution.id);
    throw error;
  }
}
