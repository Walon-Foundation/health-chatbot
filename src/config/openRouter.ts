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


export async function generateAnswerStream(question: string, context: string) {
  const response = await openRouter.chat.send({
    model: 'openai/gpt-oss-20b:free',
    stream: true,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Use the context to answer the question, and just send the answer — no extra explanation.',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  return response; // async iterable!
}


await openRouter.chat.send({
  model: 'openai/gpt-4o',
  messages: [
    {
      role: 'user',
      content: 'What is the meaning of life?',
    },
  ],
  stream: false,
});