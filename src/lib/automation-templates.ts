export interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
}

export const AUTOMATION_TEMPLATES: AutomationFlow[] = [
  {
    id: 'tpl-boas-vindas',
    name: 'Boas-vindas WhatsApp',
    description: 'Envia mensagem automática para novos leads e aguarda resposta.',
    nodes: [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 300, y: 100 },
        data: { label: 'Início', trigger: 'lead_created', title: 'Lead Criado' }
      },
      {
        id: 'node-msg-1',
        type: 'messageNode',
        position: { x: 300, y: 260 },
        data: { label: 'Mensagem', content: 'Olá {{nome}}, seja bem-vindo! Como podemos ajudar hoje?' }
      }
    ],
    edges: [
      { id: 'e-start-msg', source: 'start', target: 'node-msg-1' }
    ]
  },
  {
    id: 'tpl-qualificacao-ia',
    name: 'Qualificação Inteligente com IA',
    description: 'Classifica o perfil do lead usando IA e move de fase no Kanban.',
    nodes: [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 300, y: 100 },
        data: { label: 'Início', trigger: 'manual', title: 'Manual / Webhook' }
      },
      {
        id: 'node-ia-1',
        type: 'aiNode',
        position: { x: 300, y: 260 },
        data: { label: 'IA Copilot', prompt: 'Analise o interesse do contato e defina se é quente ou frio.' }
      }
    ],
    edges: [
      { id: 'e-start-ia', source: 'start', target: 'node-ia-1' }
    ]
  },
  {
    id: 'tpl-webhook-disparo',
    name: 'Disparo de Webhook Externo',
    description: 'Notifica seu backend ou n8n/Make quando um negócio for ganho.',
    nodes: [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 300, y: 100 },
        data: { label: 'Início', trigger: 'deal_won', title: 'Negócio Ganho' }
      },
      {
        id: 'node-http-1',
        type: 'httpNode',
        position: { x: 300, y: 260 },
        data: { label: 'API / Webhook', method: 'POST', url: 'https://seu-sistema.com/webhook' }
      }
    ],
    edges: [
      { id: 'e-start-http', source: 'start', target: 'node-http-1' }
    ]
  }
];

export function importFlowFromFile(fileContent: string): AutomationFlow {
  const parsed = JSON.parse(fileContent);
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    throw new Error('Arquivo JSON inválido: nós não encontrados.');
  }
  return parsed;
}

export function exportFlowToFile(flow: AutomationFlow) {
  const jsonStr = JSON.stringify(flow, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${flow.name.toLowerCase().replace(/\s+/g, '_')}_fluxo.json`;
  a.click();
  URL.revokeObjectURL(url);
}
