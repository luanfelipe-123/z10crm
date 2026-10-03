'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Bot, CalendarDays, CircleHelp, Funnel, Gift, LayoutGrid, LogOut, MessageSquare, Rocket, Settings, Users, Workflow, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Z10Brand from './z10-brand';

const main = [
  ['/inicio', 'Início', LayoutGrid], ['/pipelines', 'Pipelines', Funnel], ['/leads', 'Leads', Users],
  ['/impulsos', 'Impulsos', Rocket], ['/automacoes', 'Automações', Workflow], ['/chat', 'Chat ao vivo', MessageSquare], ['/agentes-ia', 'Agentes de IA', Bot],
] as const;
const secondary = [
  ['/indique-e-ganhe', 'Indique e ganhe', Gift], ['/calendario', 'Calendário', CalendarDays], ['/notificacoes', 'Notificações', Bell], ['/ajuda', 'Ajuda', CircleHelp], ['/configuracoes', 'Configurações', Settings],
] as const;

export default function Sidebar({ tenantName, onLogout, open, onClose }: { tenantName: string; onLogout: () => void; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const item = (href: string, label: string, Icon: LucideIcon) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return <Link key={href} href={href} onClick={onClose} className={`crm-nav-item ${active ? 'crm-nav-item--active' : ''}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span></Link>;
  };
  return <>
    {open && <button aria-label="Fechar menu" className="crm-backdrop" onClick={onClose}/>} 
    <aside className={`crm-sidebar ${open ? 'crm-sidebar--open' : ''}`}>
      <div className="crm-sidebar__head"><div><Z10Brand inverse/><div className="crm-sidebar__tenant">{tenantName}</div></div><button aria-label="Fechar menu" onClick={onClose} className="crm-icon-button crm-sidebar__close"><X size={18}/></button></div>
      <nav className="crm-sidebar__nav">{main.map(([h,l,i]) => item(h,l,i))}</nav>
      <nav className="crm-sidebar__nav crm-sidebar__nav--secondary">{secondary.map(([h,l,i]) => item(h,l,i))}</nav>
      <button onClick={onLogout} className="crm-sidebar__logout"><LogOut size={18}/> Sair da conta</button>
    </aside>
  </>;
}
