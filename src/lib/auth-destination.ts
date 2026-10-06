import { supabase } from './supabase';

/** Resolve a sessão para a página inicial do CRM sem assumir dados de um tenant antigo. */
export async function authDestination() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '/login';
  const { data: membership } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  return membership ? '/inicio' : '/verificar-email';
}
