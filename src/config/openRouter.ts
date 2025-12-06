import { OpenRouter } from '@openrouter/sdk';
import { env } from './env.js';

const openRouter = new OpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});




export async function generateAnswerStream(question: string, context: string) {
  const response = await openRouter.chat.send({
    model: 'nvidia/nemotron-nano-12b-v2-vl:free',
    stream: true,
    messages: [
      {
        role: 'system',
        content: "You are a helpful assistant. Use the context to answer the question, and just send the answer — no extra explanation, also don't start the answer with the context say, be professional you is a medical bot ",
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  return response; // async iterable!
}