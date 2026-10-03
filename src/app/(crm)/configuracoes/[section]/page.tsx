import { Construction } from 'lucide-react';
import { SettingsPageHeader, SettingsPanel } from '@/components/settings/SettingsUI';

const sections: Record<string, string> = {
  produtos: 'Produtos',
  'motivos-de-perda': 'Motivos de perda',
  listas: 'Listas',
  'campos-adicionais': 'Campos adicionais',
  departamentos: 'Departamentos',
  'horarios-de-trabalho': 'Horários de trabalho',
  'tipos-de-atividades': 'Tipos de atividades',
  integracoes: 'Integrações',
  conexoes: 'Conexões',
  'servidor-mcp': 'Servidor MCP',
  armazenamento: 'Armazenamento',
  lixeira: 'Lixeira',
  notificacoes: 'Notificações',
  execucoes: 'Execuções',
};

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function PendingSettingsPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = sections[section] ?? 'Configurações';
  return (
    <div>
      <SettingsPageHeader title={title} description="Este módulo já está reservado na nova interface." />
      <SettingsPanel className="flex min-h-72 flex-col items-center justify-center p-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-400/10 text-sky-300"><Construction size={26} /></div>
        <h2 className="font-semibold">Próxima etapa do Z10 CRM</h2>
        <p className="mt-2 max-w-md text-sm text-zinc-400">A estrutura visual está pronta. Agora conectaremos os dados e as regras deste módulo.</p>
      </SettingsPanel>
    </div>
  );
}
