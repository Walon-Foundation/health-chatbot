import { Hono } from "hono";
import { env } from "../config/env.js";
import axios from "axios"; // 👈 NEW AXIOS IMPORT

// --- INTERFACE DEFINITIONS ---
interface WebhookMessageData {
  messages: {
    key?: {
      fromMe: boolean;
      remoteJid: string;
      cleanedSenderPn?: string;
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
  event: "messages.received" | string;
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
    "hi",
    "hello",
    "hey",
    "hola",
    "gm",
    "good morning",
    "ge",
    "good evening",
    "ga",
    "good afternoon",
    "hii",
    "hellloo",
    "afternoon",
    "hi",
  ];

  return greetings.some((greeting) => lowerText === greeting);
}

// --------------------------------------------------------------------------
// --- 🚑 Medical Filtering Logic ---
// --------------------------------------------------------------------------
function isMedicalQuestion(text: string): boolean {
  const lowerText = text.toLowerCase();

  const medicalKeywords = [
    "symptom",
    "diagnosis",
    "doctor",
    "health",
    "medication",
    "drug",
    "disease",
    "illness",
    "pain",
    "fever",
    "cough",
    "treatment",
    "cure",
    "malaria",
    "blood pressure",
    "sick",
    "injury",
    "prescription",
    "pharmacy",
    "clinic",
    "tb",
    "tuberculosis",
    "condition",
    "prevent",
    "cholera",
    "typhoid",
    "sign",
    "symptoms",
  ];

  const questionPhrases = [
    "what is",
    "how do i treat",
    "am i sick",
    "what are the signs of",
    "how to cure",
  ];

  if (medicalKeywords.some((keyword) => lowerText.includes(keyword))) {
    return true;
  }

  if (questionPhrases.some((phrase) => lowerText.startsWith(phrase))) {
    return true;
  }

  if (lowerText.length < 5) {
    return false;
  }

  return false;
}

// --------------------------------------------------------------------------
// --- 📞 Wasender API Message Helper (UPDATED WITH AXIOS) ---
// --------------------------------------------------------------------------
async function sendWasenderMessage(chatId: string, message: string) {
  const wasenderToken = env.WASENDER_API_KEY;
  const wasenderUrl = "https://www.wasenderapi.com/api/send-message";

  try {
    const response = await axios.post(
      wasenderUrl,
      {
        // Body (Axios automatically handles JSON.stringify)
        to: chatId,
        text: message,
      },
      {
        // Configuration
        headers: {
          Authorization: `Bearer ${wasenderToken}`,
          "Content-Type": "application/json",
        },
        // Set a timeout of 10 seconds to catch ETIMEDOUT errors gracefully
        timeout: 10000, 
      }
    );

    // If successful (2xx status), Axios returns the data
    console.log("Wasender message sent successfully.");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        // Handle explicit timeout/connection errors
        console.error('Wasender API Timeout/Connection Error:', error.message);
        throw new Error(`Failed to send Wasender message: Connection Timed Out. Please check network connectivity and Wasender service status.`);
      }

      // Handle non-2xx HTTP status codes (4xx/5xx) returned by the API
      const status = error.response?.status;
      // Provide detailed error body if available, otherwise use error message
      const errorText = JSON.stringify(error.response?.data || { message: error.message });
      
      console.error('Wasender API Response Error (Status:', status, '):', errorText);
      
      throw new Error(
        `Failed to send Wasender message: ${status} - ${errorText}. IMPORTANT: Check if your Wasender session/channel is active.`,
      );
    }
    // Handle non-Axios related errors
    console.error('Wasender API Unknown Error:', error);
    throw new Error(`Failed to send Wasender message: Unknown API error.`);
  }
}

// --------------------------------------------------------------------------
// --- 🪝 Hono Webhook Endpoint ---
// --------------------------------------------------------------------------
app.post("/webhook", async (c) => {
  let recipientId: string | undefined;

  try {
    const body: WebhookBody = await c.req.json();

    // 1. Basic event validation
    if (
      body.event !== "messages.received" ||
      !body.data ||
      !body.data.messages
    ) {
      return c.json(
        {
          status: "ignored",
          reason: `Not a messages.received event or missing data`,
        },
        200,
      );
    }

    const messageData = body.data.messages;
    const messageObject = messageData.message;
    const remoteJid: string | undefined =
      messageData.key?.remoteJid || messageData.remoteJid;
    const fromMe: boolean | undefined = messageData.key?.fromMe;
    const pushName: string | undefined = messageData.pushName;

    recipientId = remoteJid;

    if (!recipientId) {
      return c.json(
        { status: "ignored", reason: "Could not determine sender JID" },
        200,
      );
    }

    // 2. Filter: Self-messages and Group chats
    if (fromMe === true || recipientId.endsWith("@g.us")) {
      return c.json(
        {
          status: "ignored",
          reason: `Ignored message from ${fromMe ? "self" : "group"}`,
        },
        200,
      );
    }

    // 3. Extract and validate text content
    let question: string | undefined;

    if (messageObject?.conversation) {
      question = messageObject.conversation;
    } else if (messageObject?.extendedTextMessage?.text) {
      question = messageObject.extendedTextMessage.text;
    } else if (messageObject?.imageMessage?.caption) {
      question = messageObject.imageMessage.caption;
    }

    const finalQuestion = question?.trim();

    if (!finalQuestion) {
      return c.json(
        { status: "ignored", reason: "Non-text or empty message type" },
        200,
      );
    }

    // 4. Greeting Logic
    if (isSimpleGreeting(finalQuestion)) {
      console.log(`Sending welcome message to: ${recipientId}`);

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
        `.trim();

      await sendWasenderMessage(recipientId, welcomeMessage);

      return c.json(
        { status: "success", message: "Welcome message sent" },
        200,
      );
    }

    // 5. Medical Content Filter
    if (!isMedicalQuestion(finalQuestion)) {
      const rejectionMessage =
        "I am a medical bot and can only answer questions related to health and medicine. Please ask a health-related question!";
      await sendWasenderMessage(recipientId, rejectionMessage);

      return c.json(
        {
          status: "ignored",
          reason: "Non-medical question detected and rejection sent",
        },
        200,
      );
    }

    // --- START PROCESSING MEDICAL REQUEST ---
    console.log("--- Processing Medical Webhook ---");
    console.log(
      `Processing medical question from ${recipientId}: "${finalQuestion}"`,
    );

    // 6. Call the external query endpoint (RAG/LLM) and handle failure
    let queryResponse;
    try {
      // NOTE: This call to env.API_URL still uses native fetch. 
      // If you get ETIMEDOUT errors here, you should consider switching this to axios as well.
      queryResponse = await fetch(`${env.API_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: finalQuestion }),
      });

      // Check for non-200 status codes from the API
      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        throw new Error(
          `Query endpoint failed (${queryResponse.status}): ${errorText}`,
        );
      }
    } catch (fetchError) {
      // --- 🚨 CRITICAL ERROR HANDLING: Send user-facing error message ---
      console.error("LLM/RAG API call failed:", fetchError);
      const serverDownMessage = `
*🚧 System Maintenance In Progress 🚧*

I apologize, but my core system is currently undergoing maintenance and cannot process your medical question right now.

We are working hard to fix it as quickly as possible. Please try asking your question again in a few minutes!
        `.trim();

      // Attempt to send the user-facing message
      try {
        await sendWasenderMessage(recipientId, serverDownMessage);
      } catch (wasenderError) {
        console.error(
          "Failed to send server-down message to user:",
          wasenderError,
        );
      }

      // Return 200 to webhook provider to acknowledge receipt
      return c.json(
        {
          status: "error",
          message: "RAG/LLM API failed; user notified of server downtime.",
        },
        200,
      );
    }

    // 7. Collect the response
    const reader = queryResponse.body?.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullAnswer += decoder.decode(value, { stream: true });
      }
    }

    const finalAnswer = fullAnswer.trim();

    if (finalAnswer.length === 0) {
      return c.json(
        { status: "ignored", reason: "Query returned an empty answer" },
        200,
      );
    }

    console.log(`Generated answer: ${finalAnswer}`);

    // 8. Send the response back via Wasender API
    await sendWasenderMessage(recipientId, finalAnswer);

    // 9. Success
    return c.json({ status: "success", message: "Response sent" }, 200);
  } catch (error) {
    // 10. Global Error Handling
    console.error("Error processing webhook:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // If we have the recipientId, attempt a final, generic error notification
    if (recipientId) {
      const genericErrorMessage =
        "A general error occurred in the bot system. The developers have been notified. Please try again shortly.";
      try {
        await sendWasenderMessage(recipientId, genericErrorMessage);
      } catch (e) {
        console.error("Failed to send final generic error message:", e);
      }
    }

    return c.json(
      {
        status: "error",
        message: errorMessage,
      },
      200,
    );
  }
});

export default app;