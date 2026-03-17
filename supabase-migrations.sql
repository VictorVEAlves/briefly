-- ============================================
-- Briefly — Migrations Supabase
-- Execute no SQL Editor do Supabase Studio
-- ============================================

-- Campanhas
create table if not exists campanhas (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  produto_destaque text not null,
  url_produto text,
  desconto_pix integer,
  desconto_cartao integer,
  parcelamento text,
  publico text[],
  canais text[],
  tom text,
  mensagem_central text,
  clickup_list_id text,
  clickup_folder_id text,
  status text default 'rascunho',
  created_at timestamptz default now()
);

-- Outputs dos agentes
create table if not exists campanha_outputs (
  id uuid default gen_random_uuid() primary key,
  campanha_id uuid references campanhas(id) on delete cascade,
  tipo text not null,        -- 'briefing' | 'email' | 'whatsapp' | 'arte_feed' | 'arte_story'
  conteudo text,             -- markdown ou HTML gerado
  url_canva text,            -- para artes
  clickup_doc_id text,
  status text default 'pendente',  -- 'pendente' | 'gerando' | 'pronto' | 'aprovado' | 'erro'
  created_at timestamptz default now()
);

-- Log de execução dos agentes
create table if not exists agente_logs (
  id uuid default gen_random_uuid() primary key,
  campanha_id uuid references campanhas(id) on delete cascade,
  agente text not null,
  status text not null,      -- 'iniciado' | 'concluido' | 'erro'
  mensagem text,
  created_at timestamptz default now()
);

-- Habilitar Realtime
alter publication supabase_realtime add table campanha_outputs;
alter publication supabase_realtime add table agente_logs;

-- Desabilitar RLS (ferramenta interna — sem multi-tenancy)
alter table campanhas disable row level security;
alter table campanha_outputs disable row level security;
alter table agente_logs disable row level security;
