'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabase';

export default function CrmShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('Z10 CRM');
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Carregando Z10 CRM...');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership) {
        setMessage('Seu usuário ainda não está vinculado a uma empresa.');
        return;
      }

      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', membership.tenant_id)
        .single();

      if (tenant?.name) setTenantName(tenant.name);
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    function updateTenantName(event: Event) {
      const name = (event as CustomEvent<string>).detail;
      if (name) setTenantName(name);
    }

    window.addEventListener('z10:tenant-name', updateTenantName);
    return () => window.removeEventListener('z10:tenant-name', updateTenantName);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!ready) return <main className="min-h-screen bg-zinc-950 p-10 text-zinc-300">{message}</main>;

  return (
    <div className="flex min-h-screen bg-zinc-900 text-white">
      <Sidebar tenantName={tenantName} onLogout={logout} />
      <main className="min-w-0 flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
