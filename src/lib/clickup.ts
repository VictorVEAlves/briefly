// Wrapper da ClickUp API
// v2: tasks, lists, folders
// v3: docs (workspace-level)

const BASE_V2 = 'https://api.clickup.com/api/v2';
const BASE_V3 = 'https://api.clickup.com/api/v3';

export class ClickUpApiError extends Error {
  status: number;
  method: string;
  path: string;
  body: string;

  constructor(status: number, method: string, path: string, body: string) {
    super(`ClickUp ${method} ${path} -> ${status}: ${body}`);
    this.name = 'ClickUpApiError';
    this.status = status;
    this.method = method;
    this.path = path;
    this.body = body;
  }
}

async function cu<T>(base: string, path: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
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
    throw new ClickUpApiError(res.status, method, path, body);
  }

  return res.json() as Promise<T>;
}

// ----- Lists ------------------------------------------------

export async function createList(nome: string): Promise<{ id: string; name: string }> {
  return cu<{ id: string; name: string }>(
    BASE_V2,
    `/folder/${process.env.CLICKUP_CAMPANHAS_FOLDER_ID}/list`,
    { method: 'POST', body: JSON.stringify({ name: nome }) }
  );
}

export async function getList(
  listId: string
): Promise<{ id: string; name: string; folder?: { id: string; name: string } }> {
  return cu(BASE_V2, `/list/${listId}`);
}

// ----- Tasks ------------------------------------------------

type CreateTaskPayload = {
  name: string;
  description?: string;
  due_date?: number;
  priority?: number;
  tags?: string[];
};

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

export async function updateTask(
  taskId: string,
  data: { status?: string; description?: string }
): Promise<void> {
  await cu<unknown>(BASE_V2, `/task/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

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

type DocParent = {
  id: string | number;
  type: 4 | 5 | 6 | 7;
};

type PageResponse = {
  id: string;
  name: string;
};

export async function createDoc(
  titulo: string,
  conteudo: string,
  parent?: DocParent
): Promise<{ id: string; title: string }> {
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID!;
  const docParent = parent ?? { id: workspaceId, type: 7 };

  const doc = await cu<DocResponse>(
    BASE_V3,
    `/workspaces/${workspaceId}/docs`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: titulo,
        parent: docParent,
      }),
    }
  );

  // ClickUp auto-creates an empty root page when a doc is created.
  // Update that root page with content instead of creating a sub-page.
  const pagesData = await cu<{ pages?: PageResponse[] }>(
    BASE_V3,
    `/workspaces/${workspaceId}/docs/${doc.id}/pages`
  );

  const rootPageId = pagesData.pages?.[0]?.id;

  if (rootPageId) {
    await cu<PageResponse>(
      BASE_V3,
      `/workspaces/${workspaceId}/docs/${doc.id}/pages/${rootPageId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name: titulo,
          content: conteudo,
          content_format: 'text/md',
        }),
      }
    );
  } else {
    // Fallback: root page not found, create one
    await cu<PageResponse>(
      BASE_V3,
      `/workspaces/${workspaceId}/docs/${doc.id}/pages`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: titulo,
          content: conteudo,
          content_format: 'text/md',
        }),
      }
    );
  }

  return { id: doc.id, title: doc.name };
}

// ----- Webhook (setup manual, nao chamado em runtime) ------

export async function registerWebhook(endpoint: string): Promise<{
  id: string;
  webhook: { id: string; secret: string };
}> {
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID!;
  return cu(BASE_V2, `/team/${workspaceId}/webhook`, {
    method: 'POST',
    body: JSON.stringify({ endpoint, events: ['taskCreated', 'listDeleted'] }),
  });
}

// ----- Utilitario de data ----------------------------------

export function calcularDueDate(dataBase: string, diasOffset: number): number {
  const date = new Date(dataBase);
  date.setDate(date.getDate() + diasOffset);
  return date.getTime();
}
