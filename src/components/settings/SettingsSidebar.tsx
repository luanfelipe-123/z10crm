'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CircleX,
  ClipboardList,
  Clock3,
  Database,
  List,
  PanelsTopLeft,
  Plug,
  Server,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  Trash2,
  UserRound,
  Users,
  Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const items: Array<[string, string, LucideIcon]> = [
  ['perfil', 'Meu perfil', UserRound],
  ['planos', 'Planos e uso', BarChart3],
  ['empresa', 'Empresa', Building2],
  ['membros', 'Membros', Users],
  ['tags', 'Tags', Tag],
  ['produtos', 'Produtos', ShoppingCart],
  ['motivos-de-perda', 'Motivos de perda', CircleX],
  ['listas', 'Listas', List],
  ['campos-adicionais', 'Campos adicionais', SlidersHorizontal],
  ['departamentos', 'Departamentos', PanelsTopLeft],
  ['horarios-de-trabalho', 'Horários de trabalho', Clock3],
  ['tipos-de-atividades', 'Tipos de atividades', CalendarDays],
  ['integracoes', 'Integrações', Plug],
  ['conexoes', 'Conexões', Wifi],
  ['servidor-mcp', 'Servidor MCP', Server],
  ['armazenamento', 'Armazenamento', Database],
  ['lixeira', 'Lixeira', Trash2],
  ['notificacoes', 'Notificações', Bell],
  ['execucoes', 'Execuções', ClipboardList],
];

export default function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="crm-sidebar">
      <div className="crm-sidebar__head justify-start gap-3">
        <Link
          href="/inicio"
          title="Voltar ao CRM"
          className="crm-icon-button border-white/10 bg-white/5 text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="font-semibold">Configurações</div>
          <div className="text-xs text-zinc-500">Z10 CRM</div>
        </div>
      </div>

      <nav className="crm-sidebar__nav flex-1 overflow-y-auto">
        {items.map(([slug, label, Icon]) => {
          const href = `/configuracoes/${slug}`;
          const active = pathname === href;
          return (
            <Link
              key={slug}
              href={href}
              className={`crm-nav-item ${active ? 'crm-nav-item--active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {slug === 'integracoes' && <Activity className="ml-auto text-zinc-600" size={12} />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
