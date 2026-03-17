// Validação das variáveis de ambiente na startup
// Falha imediatamente se alguma variável obrigatória estiver faltando

import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatória'),

  // Claude
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY é obrigatória'),

  // ClickUp
  CLICKUP_API_KEY: z.string().min(1, 'CLICKUP_API_KEY é obrigatória'),
  CLICKUP_WORKSPACE_ID: z.string().min(1, 'CLICKUP_WORKSPACE_ID é obrigatório'),
  CLICKUP_CAMPANHAS_FOLDER_ID: z.string().min(1, 'CLICKUP_CAMPANHAS_FOLDER_ID é obrigatório'),
  CLICKUP_AGENTE_FIELD_ID: z.string().min(1, 'CLICKUP_AGENTE_FIELD_ID é obrigatório'),
  CLICKUP_WEBHOOK_SECRET: z.string().min(1, 'CLICKUP_WEBHOOK_SECRET é obrigatório'),

  // Canva
  CANVA_API_KEY: z.string().min(1, 'CANVA_API_KEY é obrigatória'),
  CANVA_BRAND_TEMPLATE_FEED_ID: z.string().min(1, 'CANVA_BRAND_TEMPLATE_FEED_ID é obrigatório'),
  CANVA_BRAND_TEMPLATE_STORY_ID: z.string().min(1, 'CANVA_BRAND_TEMPLATE_STORY_ID é obrigatório'),

  // Interno
  INTERNAL_API_SECRET: z.string().min(1, 'INTERNAL_API_SECRET é obrigatório'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL deve ser uma URL válida'),
});

// Usar safeParse para mensagem de erro amigável
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
  });
  // Não lança erro em build/dev para não quebrar ao usar .env.local vazio
  // Em produção com NODE_ENV=production, lança
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Variáveis de ambiente inválidas. Veja os logs acima.');
  }
}

export const env = (parsed.success ? parsed.data : process.env) as z.infer<typeof envSchema>;
