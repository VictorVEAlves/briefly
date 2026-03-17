// ============================================================
// Tipos centrais do sistema Briefly
// Definidos antes de qualquer outro arquivo — contrato global
// ============================================================

// ----- Status -----------------------------------------------

export type CampanhaStatus =
  | 'rascunho'
  | 'gerando'
  | 'em_revisao'
  | 'aprovada'
  | 'erro';

export type OutputStatus = 'pendente' | 'gerando' | 'pronto' | 'aprovado' | 'erro';

export type OutputTipo =
  | 'briefing'
  | 'email'
  | 'whatsapp'
  | 'arte_feed'
  | 'arte_story';

export type AgenteNome =
  | 'orchestrator'
  | 'briefing'
  | 'tasks'
  | 'email'
  | 'whatsapp'
  | 'artes';

// ----- Entidades do banco -----------------------------------

export type Campanha = {
  id: string;
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  produto_destaque: string;
  url_produto: string | null;
  desconto_pix: number | null;
  desconto_cartao: number | null;
  parcelamento: string | null;
  publico: string[];
  canais: string[];
  tom: string | null;
  mensagem_central: string | null;
  clickup_list_id: string | null;
  clickup_folder_id: string | null;
  status: string;
  created_at: string;
};

export type CampanhaOutput = {
  id: string;
  campanha_id: string;
  tipo: string;
  conteudo: string | null;
  url_canva: string | null;
  clickup_doc_id: string | null;
  status: string;
  created_at: string;
};

export type AgenteLog = {
  id: string;
  campanha_id: string;
  agente: string;
  status: string;
  mensagem: string | null;
  created_at: string;
};

// ----- Insert/Update helpers --------------------------------

type CampanhaInsert = {
  id?: string;
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  produto_destaque: string;
  url_produto?: string | null;
  desconto_pix?: number | null;
  desconto_cartao?: number | null;
  parcelamento?: string | null;
  publico?: string[] | null;
  canais?: string[] | null;
  tom?: string | null;
  mensagem_central?: string | null;
  clickup_list_id?: string | null;
  clickup_folder_id?: string | null;
  status?: string | null;
  created_at?: string;
};

type CampanhaUpdate = Partial<CampanhaInsert>;

type CampanhaOutputInsert = {
  id?: string;
  campanha_id: string;
  tipo: string;
  conteudo?: string | null;
  url_canva?: string | null;
  clickup_doc_id?: string | null;
  status?: string | null;
  created_at?: string;
};

type CampanhaOutputUpdate = Partial<CampanhaOutputInsert>;

type AgenteLogInsert = {
  id?: string;
  campanha_id: string;
  agente: string;
  status: string;
  mensagem?: string | null;
  created_at?: string;
};

type AgenteLogUpdate = Partial<AgenteLogInsert>;

// ----- Tipo Database para o cliente Supabase ---------------
// Estrutura exata requerida pelo @supabase/supabase-js v2.99+

export type Database = {
  public: {
    Tables: {
      campanhas: {
        Row: Campanha;
        Insert: CampanhaInsert;
        Update: CampanhaUpdate;
        Relationships: [];
      };
      campanha_outputs: {
        Row: CampanhaOutput;
        Insert: CampanhaOutputInsert;
        Update: CampanhaOutputUpdate;
        Relationships: [];
      };
      agente_logs: {
        Row: AgenteLog;
        Insert: AgenteLogInsert;
        Update: AgenteLogUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ----- Tipos do formulário ----------------------------------

export type Canal =
  | 'email'
  | 'whatsapp'
  | 'instagram_feed'
  | 'instagram_stories';

export type Tom =
  | 'urgencia'
  | 'autoridade'
  | 'educativo'
  | 'celebracao';

export type BriefingFormData = {
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  produto_destaque: string;
  url_produto?: string;
  produtos_secundarios?: string;
  desconto_pix?: number;
  desconto_cartao?: number;
  parcelamento?: string;
  cupom?: string;
  publico: string[];
  listas_whatsapp?: string[];
  canais: Canal[];
  tom: Tom;
  mensagem_central?: string;
  argumento_principal?: string;
};

// ----- Output estruturado do WhatsApp ----------------------

export type WhatsAppMessage = {
  lista: string;
  mensagem: string;
};
