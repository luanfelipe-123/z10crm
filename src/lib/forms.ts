export type FormFieldType = 'text' | 'email' | 'whatsapp' | 'number' | 'long_text' | 'select' | 'radio' | 'checkbox' | 'date' | 'time' | 'booking';

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder: string;
  helpText?: string;
  required: boolean;
  position: number;
  options: string[];
  allowMultiple?: boolean;
  autoAdvance?: boolean;
};

export type FormSettings = {
  layout: 'single' | 'steps';
  showWelcome: boolean;
  showProgress: boolean;
  continueLabel: string;
  submitLabel: string;
  successMessage: string;
  redirectUrl?: string;
  availability: {
    timezone: string;
    startHour: number;
    endHour: number;
    intervalMinutes: number;
    weekdays: number[];
  };
  pixelId?: string;
  capiToken?: string;
  metaTestEventCode?: string;
  webhookUrl?: string;
};

export type CrmForm = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published';
  settings: FormSettings;
  created_at: string;
  updated_at: string;
};

export const fieldCatalog: Array<{ type: FormFieldType; label: string }> = [
  { type: 'text', label: 'Texto' }, { type: 'email', label: 'E-mail' }, { type: 'whatsapp', label: 'WhatsApp' },
  { type: 'number', label: 'Número' }, { type: 'long_text', label: 'Texto longo' }, { type: 'select', label: 'Lista' },
  { type: 'radio', label: 'Múltipla escolha' }, { type: 'checkbox', label: 'Caixas de seleção' },
  { type: 'date', label: 'Data' }, { type: 'time', label: 'Hora' }, { type: 'booking', label: 'Agendamento' },
];

export const defaultSettings: FormSettings = {
  layout: 'single', showWelcome: false, showProgress: true, continueLabel: 'Continuar', submitLabel: 'Enviar',
  successMessage: 'Obrigado! Recebemos suas respostas.', redirectUrl: '',
  availability: { timezone: 'America/Sao_Paulo', startHour: 9, endHour: 18, intervalMinutes: 60, weekdays: [1, 2, 3, 4, 5] },
  pixelId: '', capiToken: '', metaTestEventCode: '', webhookUrl: '',
};

export function createField(type: FormFieldType, position: number): FormField {
  const label = fieldCatalog.find((item) => item.type === type)?.label ?? 'Nova pergunta';
  const inputType = type === 'email' ? 'Seu melhor e-mail' : type === 'whatsapp' ? '(00) 00000-0000' : type === 'booking' ? 'Escolha uma data e horário' : `Digite ${label.toLowerCase()}`;
  return { id: crypto.randomUUID(), type, label: type === 'booking' ? 'Escolha o melhor horário' : `Sua ${label.toLowerCase()}`, placeholder: inputType, required: false, position, options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Opção 1', 'Opção 2'] : [], allowMultiple: type === 'checkbox', autoAdvance: false };
}

export function normalizeSettings(input: Partial<FormSettings> | null | undefined): FormSettings {
  return { ...defaultSettings, ...input, availability: { ...defaultSettings.availability, ...(input?.availability ?? {}) } };
}

export function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'formulario';
}
