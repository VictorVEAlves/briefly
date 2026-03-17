// Wrapper da ClickUp API
// v2: tasks, lists, folders
// v3: docs (workspace-level)

const BASE_V2 = 'https://api.clickup.com/api/v2';
const BASE_V3 = 'https://api.clickup.com/api/v3';

// Helper interno — faz fetch com autenticação e trata erros
async function cu<T>(base: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: process.env.CLICKUP_API_KEY!,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ClickUp ${options?.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ----- Lists ------------------------------------------------

// Cria uma lista dentro da pasta Campanhas
export async function createList(nome: string): Promise<{ id: string; name: string }> {
  return cu<{ id: string; name: string }>(
    BASE_V2,
    `/folder/${process.env.CLICKUP_CAMPANHAS_FOLDER_ID}/list`,
    { method: 'POST', body: JSON.stringify({ name: nome }) }
  );
}

// ----- Tasks ------------------------------------------------

type CreateTaskPayload = {
  name: string;
  description?: string;
  due_date?: number; // Unix ms
  priority?: number; // 1=urgent, 2=high, 3=normal, 4=low
  tags?: string[];
};

// Cria uma task dentro de uma lista
export async function createTask(
  listId: string,
  payload: CreateTaskPayload
): Promise<{ id: string; url: string; name: string }> {
  return cu<{ id: string; url: string; name: string }>(
    BASE_V2,
    `/list/${listId}/task`,
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

// Atualiza campos de uma task (status, campos customizados, etc.)
export async function updateTask(
  taskId: string,
  data: { status?: string; description?: string }
): Promise<void> {
  await cu<unknown>(BASE_V2, `/task/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Retorna os detalhes de uma task incluindo tags e list.id
export async function getTask(taskId: string): Promise<{
  id: string;
  name: string;
  list: { id: string; name: string };
  tags: Array<{ name: string }>;
}> {
  return cu(BASE_V2, `/task/${taskId}`);
}

// ----- Docs (API v3) ----------------------------------------

type DocResponse = {
  id: string;
  name: string;
};

// Cria um documento no workspace (visível na sidebar do ClickUp)
export async function createDoc(
  titulo: string,
  conteudo: string
): Promise<{ id: string; title: string }> {
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID!;

  const doc = await cu<DocResponse>(
    BASE_V3,
    `/workspaces/${workspaceId}/docs`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: titulo,
        content: conteudo,
        content_format: 'text/md',
        parent: { id: workspaceId, type: 7 }, // type 7 = workspace
      }),
    }
  );

  return { id: doc.id, title: doc.name };
}

// ----- Webhook (setup manual, não chamado em runtime) ------

// Registra webhook no ClickUp — executar uma única vez durante setup
export async function registerWebhook(endpoint: string): Promise<{
  id: string;
  webhook: { id: string; secret: string };
}> {
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID!;
  return cu(BASE_V2, `/team/${workspaceId}/webhook`, {
    method: 'POST',
    body: JSON.stringify({ endpoint, events: ['taskCreated'] }),
  });
}

// ----- Utilitário de data ----------------------------------

// Calcula due_date como Unix ms relativo a uma data base
export function calcularDueDate(dataBase: string, diasOffset: number): number {
  const date = new Date(dataBase);
  date.setDate(date.getDate() + diasOffset);
  return date.getTime();
}
