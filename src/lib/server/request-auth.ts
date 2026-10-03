import 'server-only';

import { createClient, type User } from '@supabase/supabase-js';
import { createAdminClient } from './supabase-admin';

export type RequestContext = {
  user: User;
  tenantId: string;
  admin: ReturnType<typeof createAdminClient>;
};

export async function requireRequestContext(request: Request): Promise<RequestContext> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw new Error('UNAUTHORIZED');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('Supabase não configurado.');

  const authClient = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) throw new Error('UNAUTHORIZED');

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (!membership) throw new Error('FORBIDDEN');

  return { user, tenantId: membership.tenant_id, admin };
}

export function requestError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Erro inesperado.';
  if (message === 'UNAUTHORIZED') return Response.json({ error: 'Sessão inválida.' }, { status: 401 });
  if (message === 'FORBIDDEN') return Response.json({ error: 'Usuário sem empresa ativa.' }, { status: 403 });
  return Response.json({ error: message }, { status: 500 });
}
