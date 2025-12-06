import { Hono } from 'hono';
import { env } from "../config/env.js";

// --- INTERFACE DEFINITIONS ---
interface WebhookMessageData {
  messages: {
    key?: {
      fromMe: boolean;
      remoteJid: string;
      cleanedSenderPn?: string; // Plain phone number
      [key: string]: any;
    };
    remoteJid?: string;
    messageBody: string; 
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
        [key: string]: any;
      };
      imageMessage?: {
        caption?: string; 
        [key: string]: any;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface WebhookBody {
  event: 'messages.received' | string;
  data?: WebhookMessageData;
  [key: string]: any;
}
// --- END INTERFACE DEFINITIONS ---

const app = new Hono();

// --------------------------------------------------------------------------
// --- 🚑 Medical Filtering Logic ---
// --------------------------------------------------------------------------
function isMedicalQuestion(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    const medicalKeywords = [
        "symptom", "diagnosis", "doctor", "health", "medication", 
        "drug", "disease", "illness", "pain", "fever", "cough", 
        "treatment", "cure", "malaria", "blood pressure", "sick", 
        "injury", "prescription", "pharmacy", "clinic", "tb", "tuberculosis", "condition"
    ];

    const questionPhrases = [
        "what is", "how do i treat", "am i sick", "what are the signs of", "how to cure"
    ];

    // 1. Check if any core keyword is present
    if (medicalKeywords.some(keyword => lowerText.includes(keyword))) {
        return true;
    }

    // 2. Check if it's phrased like a medical question
    if (questionPhrases.some(phrase => lowerText.startsWith(phrase))) {
        return true;
    }

    // 3. Simple length check (filter out single-word noise like "Yes")
    if (lowerText.length < 5) {
        return false;
    }

    return false;
}

// --------------------------------------------------------------------------
// --- 📞 Whapi Message Sending Helper ---
// --------------------------------------------------------------------------
async function sendWasenderMessage(chatId: string, message: string) {
  const wasenderToken = env.WASENDER_API_KEY; 
  const wasenderUrl = 'https://www.wasenderapi.com/api/send-message';
  
  const response = await fetch(wasenderUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${wasenderToken}`,
      'Content-Type': 'application/json',
    },
    // Use the JID or cleaned phone number provided in chatId
    body: JSON.stringify({
      to: chatId,
      text: message,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Whapi API Response Error:', errorText);
    // Include context about the common 404 error
    throw new Error(`Failed to send Whapi message: ${response.status} - ${errorText}. IMPORTANT: Check if your Whapi session/channel is active.`);
  }
  
  const result = await response.json();
  console.log('Whapi message sent successfully.'); 
  return result;
}

// --------------------------------------------------------------------------
// --- 🪝 Hono Webhook Endpoint ---
// --------------------------------------------------------------------------
app.post('/webhook', async (c) => {
  try {
    const body: WebhookBody = await c.req.json();
    
    // 1. Basic event validation
    if (body.event !== 'messages.received' || !body.data) {
      return c.json({ status: 'ignored', reason: `Not a messages.received event or missing data` }, 200);
    }
    
    const messageData = body.data.messages;

    if (!messageData) {
      return c.json({ status: 'ignored', reason: 'No message data found in payload' }, 200);
    }
    
    const messageObject = messageData.message;
    // remoteJid is the most reliable JID for replying (e.g., 20277060702395@lid)
    const remoteJid: string | undefined = messageData.key?.remoteJid || messageData.remoteJid;
    const fromMe: boolean | undefined = messageData.key?.fromMe;

    const recipientId = remoteJid; // Use JID as the primary recipient ID

    if (!recipientId) {
        return c.json({ status: 'ignored', reason: 'Could not determine sender JID' }, 200);
    }

    // 2. Initial Filtering: Self-messages and Group chats
    if (fromMe === true || recipientId.endsWith('@g.us')) {
      return c.json({ status: 'ignored', reason: `Ignored message from ${fromMe ? 'self' : 'group'}` }, 200);
    }

    // 3. Extract text content (Text/Caption filter)
    let question: string | undefined;

    if (messageObject?.conversation) {
        question = messageObject.conversation;
    } else if (messageObject?.extendedTextMessage?.text) {
        question = messageObject.extendedTextMessage.text;
    } else if (messageObject?.imageMessage?.caption) {
        question = messageObject.imageMessage.caption;
    } else {
        return c.json({ status: 'ignored', reason: 'Non-text message type (e.g., sticker, audio, edit)' }, 200);
    }
    
    const finalQuestion = question.trim();

    if (!finalQuestion || finalQuestion.length === 0) {
        return c.json({ status: 'ignored', reason: 'Empty text after cleaning' }, 200);
    }
    
    // 4. Medical Content Filter
    if (!isMedicalQuestion(finalQuestion)) {
        // console.log(`Ignoring non-medical query from ${recipientId}: "${finalQuestion}"`);
        
        // const rejectionMessage = "I am a medical bot and can only answer questions related to health and medicine. Please ask a health-related question!";
        // await sendWasenderMessage(recipientId, rejectionMessage);
        
        return c.json({ status: 'ignored', reason: 'Non-medical question detected' }, 200);
    }
    
    // --- START PROCESSING MEDICAL REQUEST ---
    // Logging: Only log the detailed request for medical questions being processed
    console.log('--- Processing Medical Webhook ---');
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    console.log(`Processing medical question from ${recipientId}: "${finalQuestion}"`);
    
    // 5. Call the external query endpoint (RAG/LLM)
    const queryResponse = await fetch(`${env.API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: finalQuestion }),
    });
    
    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      throw new Error(`Query endpoint failed (${queryResponse.status}): ${errorText}`);
    }
    
    // 6. Collect the streamed response
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
    
    const finalAnswer = fullAnswer.trim(); 
    
    if (finalAnswer.length === 0) {
        return c.json({ status: 'ignored', reason: 'Query returned an empty answer' }, 200);
    }

    console.log(`Generated answer: ${finalAnswer}`);
    
    // 7. Send the response back via Whapi (MUST SUCCEED)
    await sendWasenderMessage(recipientId, finalAnswer); 
    
    // 8. Success: Send 200 ONLY after the answer is successfully sent.
    return c.json({ status: 'success', message: 'Response sent' }, 200);
    
  } catch (error) {
    // 9. Global Error Handling: Log the failure and return 200 to webhook provider
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return c.json({ 
      status: 'error', 
      message: errorMessage 
    }, 200); 
  }
});

export default app;