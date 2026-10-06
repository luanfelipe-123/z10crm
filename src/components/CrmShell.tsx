'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabase';

const labels: Record<string, string> = { inicio: 'Visão geral', pipelines: 'Pipelines', leads: 'Leads', formularios: 'Formulários', impulsos: 'Impulsos', automacoes: 'Automações', chat: 'Chat ao vivo', 'agentes-ia': 'Agentes de IA', calendario: 'Calendário', notificacoes: 'Notificações', ajuda: 'Central de ajuda', 'indique-e-ganhe': 'Indique e ganhe' };

export default function CrmShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tenantName, setTenantName] = useState('Z10 CRM');
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Carregando seu espaço...');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { data: membership, error: membershipError } = await supabase.from('memberships').select('tenant_id').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (membershipError || !membership) { setMessage('Seu usuário ainda não está vinculado a uma empresa.'); return; }
    const { data: tenant } = await supabase.from('tenants').select('name').eq('id', membership.tenant_id).single();
    if (tenant?.name) setTenantName(tenant.name);
    setReady(true);
  })(); }, [router]);

  useEffect(() => { const updateTenantName = (event: Event) => { const name = (event as CustomEvent<string>).detail; if (name) setTenantName(name); }; window.addEventListener('z10:tenant-name', updateTenantName); return () => window.removeEventListener('z10:tenant-name', updateTenantName); }, []);
  async function logout() { await supabase.auth.signOut(); router.replace('/login'); }
  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-surface-darker p-8 text-sm text-slate-300">{message}</main>;

  const settingsMode = pathname.startsWith('/configuracoes');
  if (settingsMode) return <>{children}</>;
  const section = pathname.split('/')[1] || 'inicio';
  return <div className="crm-shell">
    <Sidebar tenantName={tenantName} onLogout={logout} open={menuOpen} onClose={() => setMenuOpen(false)}/>
    <main className="crm-main">
      <header className="crm-topbar"><div className="flex items-center gap-3"><button aria-label="Abrir menu" onClick={() => setMenuOpen(true)} className="crm-icon-button crm-mobile-toggle"><Menu size={18}/></button><div><div className="crm-topbar__title">{labels[section] || 'Z10 CRM'}</div><div className="crm-topbar__context">{tenantName}</div></div></div><div className="crm-topbar__actions"><button aria-label="Pesquisar" className="crm-icon-button"><Search size={17}/></button><LinkIcon href="/notificacoes" label="Notificações"><Bell size={17}/></LinkIcon></div></header>
      <div className="crm-content">{children}</div>
    </main>
  </div>;
}

function LinkIcon({ href, label, children }: { href: string; label: string; children: ReactNode }) { return <a href={href} aria-label={label} className="crm-icon-button">{children}</a>; }
