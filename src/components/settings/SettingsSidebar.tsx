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
    <aside className="sticky top-0 flex h-screen w-[250px] shrink-0 flex-col border-r border-white/10 bg-[#1e1f1d] text-white">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <Link
          href="/inicio"
          title="Voltar ao CRM"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="font-semibold">Configurações</div>
          <div className="text-xs text-zinc-500">Z10 CRM</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {items.map(([slug, label, Icon]) => {
          const href = `/configuracoes/${slug}`;
          const active = pathname === href;
          return (
            <Link
              key={slug}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${active ? 'bg-slate-700/70 text-sky-300' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}
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
