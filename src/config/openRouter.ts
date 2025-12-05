import { OpenRouter } from '@openrouter/sdk';
import { env } from './env.js';

const openRouter = new OpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});


export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openRouter.embeddings.generate({
    model: 'openai/text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding as number[];
}

