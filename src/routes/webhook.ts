import { Hono } from 'hono';
import { env } from "../config/env.js";

const app = new Hono();

// Whapi webhook endpoint
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    // Log the incoming webhook for debugging
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    
    // Check if this is a message event
    if (body.event?.type !== 'messages' || body.event?.event !== 'post') {
      return c.json({ status: 'ignored', reason: 'Not a message event' }, 200);
    }
    
    // Get the first message
    const message = body.messages?.[0];
    
    if (!message) {
      return c.json({ status: 'ignored', reason: 'No message found' }, 200);
    }
    
    // Ignore messages from ourselves
    if (message.from_me) {
      return c.json({ status: 'ignored', reason: 'Message from self' }, 200);
    }
    
    // Extract the question text
    const question = message.text?.body;
    
    if (!question || question.trim() === '') {
      return c.json({ status: 'ignored', reason: 'Empty message' }, 200);
    }
    
    // Get the sender's chat ID
    const chatId = message.chat_id;
    
    console.log(`Processing question from ${chatId}: ${question}`);
    
    // Call the existing /query endpoint
    const queryResponse = await fetch('http://localhost:3000/api/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });
    
    if (!queryResponse.ok) {
      throw new Error(`Query endpoint failed: ${queryResponse.status}`);
    }
    
    // Collect the streamed response
    const reader = queryResponse.body?.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = '';
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullAnswer += decoder.decode(value, { stream: true });
      }
    }
    
    console.log(`Generated answer: ${fullAnswer}`);
    
    // Send the response back via Whapi
    await sendWhapiMessage(chatId, fullAnswer);
    
    return c.json({ status: 'success', message: 'Response sent' }, 200);
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 200); // Still return 200 to avoid webhook retries
  }
});

// Helper function to send messages via Whapi
async function sendWhapiMessage(chatId: string, message: string) {
  const whapiToken = env.WHAPI_API_KEY;
  const whapiUrl = 'https://gate.whapi.cloud/messages/text';
  
  const response = await fetch(whapiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${whapiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: chatId,
      body: message,
      typing_time: 0, // No typing simulation for faster response
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send Whapi message: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log('Whapi message sent:', result);
  return result;
}

export default app;
