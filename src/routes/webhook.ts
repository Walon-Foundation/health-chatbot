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
// --- 🤝 Greeting Logic ---
// --------------------------------------------------------------------------
function isSimpleGreeting(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    
    const greetings = [
        "hi", "hello", "hey", "hola", "gm", "good morning", 
        "ge", "good evening", "ga", "good afternoon"
    ];

    // Check if the entire message is one of the simple greetings
    return greetings.some(greeting => lowerText === greeting);
}

// --------------------------------------------------------------------------
// --- 🚑 Medical Filtering Logic ---
// (No changes here, keeping your original function)
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
// (No changes here, keeping your original function)
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
// --- 🪝 Hono Webhook Endpoint (MODIFIED) ---
// --------------------------------------------------------------------------
app.post('/webhook', async (c) => {
  try {
    const body: WebhookBody = await c.req.json();
    
    // ... (Your original validation logic)
    if (body.event !== 'messages.received' || !body.data) {
      return c.json({ status: 'ignored', reason: `Not a messages.received event or missing data` }, 200);
    }
    
    const messageData = body.data.messages;

    if (!messageData) {
      return c.json({ status: 'ignored', reason: 'No message data found in payload' }, 200);
    }
    
    const messageObject = messageData.message;
    const remoteJid: string | undefined = messageData.key?.remoteJid || messageData.remoteJid;
    const fromMe: boolean | undefined = messageData.key?.fromMe;
    const pushName: string | undefined = messageData.pushName; // Get user's contact name if available

    const recipientId = remoteJid; 

    if (!recipientId) {
        return c.json({ status: 'ignored', reason: 'Could not determine sender JID' }, 200);
    }

    // 1. Initial Filtering: Self-messages and Group chats
    if (fromMe === true || recipientId.endsWith('@g.us')) {
      return c.json({ status: 'ignored', reason: `Ignored message from ${fromMe ? 'self' : 'group'}` }, 200);
    }

    // 2. Extract text content
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
    
    // --- NEW LOGIC FOR GREETING ---
    if (isSimpleGreeting(finalQuestion)) {
        console.log(`Sending welcome message to: ${recipientId}`);
        
        // Use PushName for a more personalized greeting if available
        const userName = pushName || "there"; 
        
        const welcomeMessage = `
*👋 Hello, ${userName}! I am your AI Medical Assistant.*

I am here to help answer your general health and medical questions. I can provide information on:
* Symptoms
* Diseases (e.g., Malaria, TB)
* General treatment options
* Health tips

*❗ Important Disclaimer:*
I am an AI and *not* a real doctor. My answers are for *informational purposes only* and should *never* replace advice from a qualified healthcare professional. For any medical emergency or personal advice, please contact a clinic or doctor immediately.

*How to use me:*
Just ask your health question!
_Example: "What are the early symptoms of malaria?"_

*What happens if you ask a non-medical question?*
I will ignore it or politely tell you that I only answer medical questions.

How can I help you today?
        `.trim(); // Use .trim() to clean up the multiline string formatting
        
        await sendWasenderMessage(recipientId, welcomeMessage);
        
        return c.json({ status: 'success', message: 'Welcome message sent' }, 200);
    }
    // --- END NEW LOGIC FOR GREETING ---
    
    // 3. Medical Content Filter (only runs if it wasn't a simple greeting)
    if (!isMedicalQuestion(finalQuestion)) {
        // Send a rejection message for non-medical questions
        const rejectionMessage = "I am a medical bot and can only answer questions related to health and medicine. Please ask a health-related question!";
        await sendWasenderMessage(recipientId, rejectionMessage);
        
        return c.json({ status: 'ignored', reason: 'Non-medical question detected and rejection sent' }, 200);
    }
    
    // --- START PROCESSING MEDICAL REQUEST ---
    console.log('--- Processing Medical Webhook ---');
    console.log(`Processing medical question from ${recipientId}: "${finalQuestion}"`);
    
    // 4. Call the external query endpoint (RAG/LLM)
    const queryResponse = await fetch(`${env.API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: finalQuestion }),
    });
    
    // ... (Your original streaming and sending logic)
    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      throw new Error(`Query endpoint failed (${queryResponse.status}): ${errorText}`);
    }
    
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
    
    // 5. Send the response back via Whapi
    await sendWasenderMessage(recipientId, finalAnswer); 
    
    // 6. Success
    return c.json({ status: 'success', message: 'Response sent' }, 200);
    
  } catch (error) {
    // 7. Global Error Handling
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Always return 200 to the webhook provider even on internal error
    return c.json({ 
      status: 'error', 
      message: errorMessage 
    }, 200); 
  }
});

export default app;