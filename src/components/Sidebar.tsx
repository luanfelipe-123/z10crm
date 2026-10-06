'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Funnel, Users, Rocket, Workflow, MessageSquare, Bot, FileText,
  Gift, Bell, CircleHelp, Settings, CalendarDays, LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const main = [
  ['/inicio', 'Início', LayoutGrid],
  ['/pipelines', 'Pipelines', Funnel],
  ['/leads', 'Leads', Users],
  ['/formularios', 'Formulários', FileText],
  ['/impulsos', 'Impulsos', Rocket],
  ['/automacoes', 'Automações', Workflow],
  ['/chat', 'Chat ao vivo', MessageSquare],
  ['/agentes-ia', 'Agentes de IA', Bot],
] as const;

const secondary = [
  ['/indique-e-ganhe', 'Indique e ganhe', Gift],
  ['/calendario', 'Calendário', CalendarDays],
  ['/notificacoes', 'Notificações', Bell],
  ['/ajuda', 'Ajuda', CircleHelp],
  ['/configuracoes', 'Configurações', Settings],
] as const;

export default function Sidebar({ tenantName, onLogout }: { tenantName: string; onLogout: () => void }) {
  const pathname = usePathname();
  const item = (href: string, label: string, Icon: LucideIcon) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? 'bg-sky-500/15 text-sky-300' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}>
        <Icon size={19} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-zinc-950 p-4 text-white">
      <div className="mb-6 px-2">
        <div className="text-2xl font-black tracking-tight">Z10</div>
        <div className="mt-1 truncate text-xs text-zinc-500">{tenantName}</div>
      </div>
      <nav className="space-y-1">{main.map(([h,l,i]) => item(h,l,i))}</nav>
      <div className="flex-1" />
      <nav className="space-y-1">{secondary.map(([h,l,i]) => item(h,l,i))}</nav>
      <button onClick={onLogout} className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white">
        <LogOut size={19} /> Sair
      </button>
    </aside>
  );
}
