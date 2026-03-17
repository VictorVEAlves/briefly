// Wrapper da Claude API usando o SDK oficial @anthropic-ai/sdk

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  timeout: 50_000,
});

// Geracao de texto simples (system + user prompt)
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') {
    throw new Error('Claude retornou conteudo nao-texto');
  }
  return block.text;
}

// Helper para extrair JSON da resposta
export function parseJsonFromResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(cleaned) as T;
}
