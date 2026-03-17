// Wrapper da Claude API usando o SDK oficial @anthropic-ai/sdk

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  timeout: 120_000, // 2 minutos — geração de HTML pode ser longa
});

// Geração de texto simples (system + user prompt)
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') {
    throw new Error('Claude retornou conteúdo não-texto');
  }
  return block.text;
}

// Helper para extrair JSON da resposta (Claude às vezes envolve em ```json ... ```)
export function parseJsonFromResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned) as T;
}
