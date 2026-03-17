// Utilitarios compartilhados por todos os agentes
// - logAgente: salva logs na tabela agente_logs
// - validateInternalSecret: valida chamadas inter-servico
// - callAgent: helper para chamar outros agentes

import { supabaseAdmin } from './supabase';

// Salva um registro na tabela agente_logs
export async function logAgente(
  campanhaId: string,
  agente: string,
  status: 'iniciado' | 'concluido' | 'erro',
  mensagem?: string
): Promise<void> {
  await supabaseAdmin.from('agente_logs').insert({
    campanha_id: campanhaId,
    agente,
    status,
    mensagem: mensagem ?? null,
  });
}

// Valida o header Authorization das chamadas inter-servico
export function validateInternalSecret(req: Request): boolean {
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${process.env.INTERNAL_API_SECRET}`;
}

// Retorna resposta 401 padrao para chamadas nao autorizadas
export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Nao autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizeBaseUrl(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace(/\/$/, '');
  }

  return `https://${value.replace(/\/$/, '')}`;
}

export function resolveAppBaseUrl(preferredBaseUrl?: string): string {
  const candidate =
    preferredBaseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!candidate) {
    throw new Error(
      'Nao foi possivel resolver a URL base da aplicacao. Defina NEXT_PUBLIC_APP_URL ou use o ambiente da Vercel.'
    );
  }

  return normalizeBaseUrl(candidate);
}

// Chama um agente interno via HTTP (POST com o secret de autenticacao)
export async function callAgent(
  path: string,
  body: Record<string, unknown>,
  options?: { baseUrl?: string }
): Promise<Response> {
  const baseUrl = resolveAppBaseUrl(options?.baseUrl);

  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
    },
    body: JSON.stringify(body),
  });
}
