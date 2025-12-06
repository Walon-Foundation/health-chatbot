import { Hono } from 'hono';
import { generateAnswerStream } from "../config/openRouter.js";
import { getEmbedding } from '../config/openai.js';
import { pineconeIndex } from "../config/pinecone.js";

const app = new Hono();

import { streamText } from 'hono/streaming' // Best for plain text stream

app.post('/query', async (c) => {
  const { question } = await c.req.json();
  if (!question) return c.json({ error: 'Missing question' }, 400);

  // 1. Embed the query
  const queryEmbedding = await getEmbedding(question);

  // 2. Search Pinecone
  const results = await pineconeIndex.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
  });

  // 3. Extract context from metadata
  const context = results.matches
    .map((m) => m.metadata?.text || '')
    .join('\n\n');

  // 4. Stream the response from Groq
  const aiStream = await generateAnswerStream(question, context);

  return streamText(c, async (stream) => {
    for await (const chunk of aiStream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) {
        await stream.write(text);
      }
    }
  })
});




export default app