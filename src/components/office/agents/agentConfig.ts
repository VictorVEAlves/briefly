import type { Agente, AgenteLog, Campanha, CampanhaOutput, OutputTipo } from '@/types/campanha';

export type CoreOfficeAgentId = 'briefing' | 'email' | 'whatsapp' | 'tasks' | 'canva';
export type OfficeEntityId = CoreOfficeAgentId | 'hub' | string;
export type OfficeDerivedStatus = 'idle' | 'working' | 'done' | 'error' | 'waiting';
export type OfficeConnectionState = 'connecting' | 'live' | 'offline';

export type OfficeAgentStatus = {
  id: CoreOfficeAgentId;
  displayName: string;
  role: string;
  status: OfficeDerivedStatus;
  currentCampaign?: string;
  lastAction?: string;
  lastActionAt?: string;
  tasksTotal: number;
  tasksCompleted: number;
  errorMessage?: string;
  color: string;
  accent: string;
  hairColor: string;
  clothingColor: string;
  isCore: true;
  workMode: 'type' | 'read';
};

export type OfficeMetrics = {
  activeCampaigns: number;
  readyCampaigns: number;
  pendingTasks: number;
  outputsGenerated: number;
  approvals: number;
  errors: number;
};

export type OfficeStatusStore = {
  coreAgents: OfficeAgentStatus[];
  extraAgents: Agente[];
  globalMetrics: OfficeMetrics;
  recentLogs: AgenteLog[];
  connectionState: OfficeConnectionState;
};

export type CoreAgentConfig = {
  id: CoreOfficeAgentId;
  backendAgent: 'briefing' | 'email' | 'whatsapp' | 'tasks' | 'artes';
  displayName: string;
  shortLabel: string;
  role: string;
  color: string;
  accent: string;
  hairColor: string;
  clothingColor: string;
  outputTypes: OutputTipo[];
  channels: string[];
  workMode: 'type' | 'read';
  personality: string;
};

export const CORE_AGENT_CONFIGS: CoreAgentConfig[] = [
  {
    id: 'briefing',
    backendAgent: 'briefing',
    displayName: 'Briefing Agent',
    shortLabel: 'Briefing',
    role: 'Planejamento e narrativa da campanha',
    color: '#a855f7',
    accent: '#d8b4fe',
    hairColor: '#3b2414',
    clothingColor: '#8b5cf6',
    outputTypes: ['briefing'],
    channels: [],
    workMode: 'read',
    personality: 'Lidera a estrategia e organiza a campanha no hub central.',
  },
  {
    id: 'email',
    backendAgent: 'email',
    displayName: 'Email Specialist',
    shortLabel: 'Email',
    role: 'Assunto, preview e HTML de email marketing',
    color: '#3b82f6',
    accent: '#93c5fd',
    hairColor: '#111827',
    clothingColor: '#2563eb',
    outputTypes: ['email'],
    channels: ['email'],
    workMode: 'type',
    personality: 'Focado, rapido e sempre no teclado.',
  },
  {
    id: 'whatsapp',
    backendAgent: 'whatsapp',
    displayName: 'WhatsApp Writer',
    shortLabel: 'WhatsApp',
    role: 'Mensagens curtas e diretas para conversao',
    color: '#22c55e',
    accent: '#86efac',
    hairColor: '#b45309',
    clothingColor: '#16a34a',
    outputTypes: ['whatsapp'],
    channels: ['whatsapp'],
    workMode: 'type',
    personality: 'Comunicativo, gesticula e responde em ritmo de chat.',
  },
  {
    id: 'tasks',
    backendAgent: 'tasks',
    displayName: 'Tasks Manager',
    shortLabel: 'Tasks',
    role: 'Cria, coordena e acompanha execucao no ClickUp',
    color: '#06b6d4',
    accent: '#67e8f9',
    hairColor: '#6b4f3a',
    clothingColor: '#0891b2',
    outputTypes: [],
    channels: [],
    workMode: 'read',
    personality: 'Metodico, sempre conferindo listas e prazos.',
  },
  {
    id: 'canva',
    backendAgent: 'artes',
    displayName: 'Canva Designer',
    shortLabel: 'Canva',
    role: 'Criativos visuais, feed e stories',
    color: '#f97316',
    accent: '#fdba74',
    hairColor: '#d6a449',
    clothingColor: '#ea580c',
    outputTypes: ['arte_feed', 'arte_story'],
    channels: ['instagram_feed', 'instagram_stories'],
    workMode: 'read',
    personality: 'Criativo, atento aos detalhes visuais e aprovacoes.',
  },
];

export const CORE_AGENT_IDS = CORE_AGENT_CONFIGS.map((config) => config.id);

export const OFFICE_STATUS_META: Record<
  OfficeDerivedStatus,
  { label: string; color: string; glow: string }
> = {
  idle: { label: 'Ocioso', color: '#9ca3af', glow: 'rgba(156,163,175,0.28)' },
  working: { label: 'Trabalhando', color: '#facc15', glow: 'rgba(250,204,21,0.3)' },
  done: { label: 'Pronto', color: '#22c55e', glow: 'rgba(34,197,94,0.32)' },
  error: { label: 'Erro', color: '#ef4444', glow: 'rgba(239,68,68,0.3)' },
  waiting: { label: 'Aguardando', color: '#cbd5e1', glow: 'rgba(203,213,225,0.28)' },
};

export function getCoreAgentConfig(id: CoreOfficeAgentId) {
  return CORE_AGENT_CONFIGS.find((config) => config.id === id)!;
}

export function isCoreAgentId(value: string): value is CoreOfficeAgentId {
  return CORE_AGENT_IDS.includes(value as CoreOfficeAgentId);
}

export function isActiveCampaign(
  campanha: Pick<Campanha, 'status' | 'archived_at'>
) {
  return !campanha.archived_at && campanha.status !== 'aprovada' && campanha.status !== 'erro';
}

export function isOutputCompleted(output: Pick<CampanhaOutput, 'status'>) {
  return output.status === 'pronto' || output.status === 'aprovado';
}

export function isOutputAwaitingApproval(output: Pick<CampanhaOutput, 'status'>) {
  return output.status === 'pronto';
}

export function isOutputTerminal(output: Pick<CampanhaOutput, 'status'>) {
  return (
    output.status === 'pronto' ||
    output.status === 'aprovado' ||
    output.status === 'erro'
  );
}

export function getExpectedOutputTypes(campanha: Campanha): OutputTipo[] {
  const types: OutputTipo[] = ['briefing'];
  const canais = Array.isArray(campanha.canais) ? campanha.canais : [];

  if (canais.includes('email')) types.push('email');
  if (canais.includes('whatsapp')) types.push('whatsapp');
  if (canais.includes('instagram_feed')) types.push('arte_feed');
  if (canais.includes('instagram_stories')) types.push('arte_story');

  return types;
}

export function isCampaignReady(campanha: Campanha, outputs: CampanhaOutput[]) {
  const expectedTypes = getExpectedOutputTypes(campanha);
  if (expectedTypes.length === 0) return false;

  const latestByType = new Map<OutputTipo, CampanhaOutput>();
  for (const output of outputs) {
    if (output.campanha_id !== campanha.id) continue;
    if (!expectedTypes.includes(output.tipo as OutputTipo)) continue;

    const current = latestByType.get(output.tipo as OutputTipo);
    if (!current || new Date(output.created_at).getTime() > new Date(current.created_at).getTime()) {
      latestByType.set(output.tipo as OutputTipo, output);
    }
  }

  if (latestByType.size !== expectedTypes.length) return false;

  const latestOutputs = Array.from(latestByType.values());
  const hasCompletedOutput = latestOutputs.some(isOutputCompleted);

  return hasCompletedOutput && latestOutputs.every(isOutputTerminal);
}
