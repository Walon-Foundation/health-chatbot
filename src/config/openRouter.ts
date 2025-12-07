import { OpenRouter } from "@openrouter/sdk";
import { env } from "./env.js";

const openRouter = new OpenRouter({
	apiKey: env.OPENROUTER_API_KEY,
});

export async function generateAnswer(question: string, context: string) {
	const modelToUse = "tngtech/deepseek-r1t2-chimera:free";

	const response = await openRouter.chat.send({
		// REMOVED: stream: true
		model: modelToUse,
		messages: [
			{
				role: "system",
				content: `You are a medical assistant trained to provide accurate, safe, and professional health information.
            Use ONLY the information from the provided context to answer the user's question. 
            Do NOT reference the context directly in your answer. 
            Give clear, medically responsible responses that are factual, concise, and easy for the user to understand.

            If the context does not contain enough information to answer safely, respond with:
            "I don't have enough information from the context to give a specific answer."

            Do NOT guess, invent medical facts, or provide diagnoses or treatments beyond what is described in the context.

            Your tone must be calm, supportive, and medically appropriate.
            Do not include disclaimers unless necessary for safety.
            Answer the question directly and professionally.`,
			},
			{
				role: "user",
				content: `Context:\n${context}\n\nQuestion: ${question}`,
			},
		],
	});

	// Extract the text content from the first choice
	const answer =
		response.choices?.[0]?.message?.content || "Error: AI response was empty.";

	return answer;
}
