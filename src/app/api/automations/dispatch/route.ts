import { runAutomation } from '@/lib/server/automation-runner';
import { requestError, requireRequestContext } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { admin, tenantId } = await requireRequestContext(request);
    const body = await request.json() as { event?: string; payload?: unknown; automationId?: string };
    if (!body.event) throw new Error('Evento não informado.');
    let query = admin.from('automations').select('id,tenant_id,name,action_type,action_config').eq('tenant_id', tenantId).eq('trigger_type', body.event).eq('enabled', true);
    if (body.automationId) query = query.eq('id', body.automationId);
    const { data, error } = await query;
    if (error) throw error;
    const results = await Promise.allSettled((data ?? []).map((automation) => runAutomation(admin, automation, body.payload ?? {}, body.event!)));
    return Response.json({ matched: data?.length ?? 0, succeeded: results.filter((item) => item.status === 'fulfilled').length });
  } catch (error) {
    return requestError(error);
  }
}
