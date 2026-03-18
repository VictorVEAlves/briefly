import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL deve ser uma URL valida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY e obrigatoria'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY e obrigatoria'),

  // Claude
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY e obrigatoria'),

  // ClickUp
  CLICKUP_API_KEY: z.string().min(1, 'CLICKUP_API_KEY e obrigatoria'),
  CLICKUP_WORKSPACE_ID: z.string().min(1, 'CLICKUP_WORKSPACE_ID e obrigatorio'),
  CLICKUP_CAMPANHAS_FOLDER_ID: z.string().min(1, 'CLICKUP_CAMPANHAS_FOLDER_ID e obrigatorio'),
  CLICKUP_AGENTE_FIELD_ID: z.string().min(1, 'CLICKUP_AGENTE_FIELD_ID e obrigatorio'),
  CLICKUP_WEBHOOK_SECRET: z.string().min(1, 'CLICKUP_WEBHOOK_SECRET e obrigatorio'),

  // Canva
  CANVA_CLIENT_ID: z.string().min(1, 'CANVA_CLIENT_ID e obrigatorio'),
  CANVA_CLIENT_SECRET: z.string().min(1, 'CANVA_CLIENT_SECRET e obrigatorio'),
  // Opcionais — se vazios, agente de artes usa design em branco com dimensões corretas
  CANVA_BRAND_TEMPLATE_FEED_ID: z.string().optional(),
  CANVA_BRAND_TEMPLATE_STORY_ID: z.string().optional(),

  // Interno
  INTERNAL_API_SECRET: z.string().min(1, 'INTERNAL_API_SECRET e obrigatorio'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL deve ser uma URL valida').optional(),

  // Google Analytics / Search Console — modo Service Account (JWT)
  GOOGLE_CLIENT_EMAIL: z.string().email('GOOGLE_CLIENT_EMAIL deve ser um email valido').optional(),
  GOOGLE_PRIVATE_KEY: z.string().min(1, 'GOOGLE_PRIVATE_KEY invalida').optional(),
  // Google Analytics / Search Console — modo OAuth2 (alternativa sem private key)
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REFRESH_TOKEN: z.string().min(1).optional(),
  // Comum aos dois modos
  GOOGLE_GA4_PROPERTY_ID: z.string().min(1, 'GOOGLE_GA4_PROPERTY_ID invalida').optional(),
  GOOGLE_SEARCH_CONSOLE_SITE_URL: z.string().min(1, 'GOOGLE_SEARCH_CONSOLE_SITE_URL invalida').optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variaveis de ambiente invalidas:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Variaveis de ambiente invalidas. Veja os logs acima.');
  }
}

export const env = (parsed.success ? parsed.data : process.env) as z.infer<typeof envSchema>;
