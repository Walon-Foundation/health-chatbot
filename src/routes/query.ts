import { Hono } from "hono";
// IMPORT CHANGE: Use the new non-streaming function
import { generateAnswer } from "../config/openRouter.js";
import { getEmbedding } from "../config/openai.js";
import { pineconeIndex } from "../config/pinecone.js";

const app = new Hono();

app.post("/query", async (c) => {
	const { question } = await c.req.json();

	// Check 1: Missing question (Client Error)
	if (!question) {
		return c.json({ error: "Missing question" }, 400); // 400 Bad Request
	}

	try {
		// 1. Embed the query
		const queryEmbedding = await getEmbedding(question);

		// 2. Search Pinecone
		const results = await pineconeIndex.query({
			vector: queryEmbedding,
			topK: 20,
			includeMetadata: true,
		});

		// 3. Extract context from metadata
		const context = results.matches
			.map((m) => m.metadata?.text || "")
			.join("\n\n");

		// 4. Get the full response from OpenRouter
		const finalAnswer = await generateAnswer(question, context);

		// Check 2: Empty or Invalid AI Response (Internal Error)
		if (!finalAnswer || finalAnswer.length === 0) {
			console.error(
				"Error in RAG pipeline: AI returned an empty or invalid answer.",
			);
			// Return 500 status to the webhook caller (which will then notify the user)
			return c.text("Sorry, the AI model failed to generate a response.", 500);
		}

		// 5. Return the final answer as plain text
		return c.text(finalAnswer as string);
	} catch (error) {
		// Check 3: General system error (Embedding, Pinecone, Network, etc.)
		console.error("Error in RAG pipeline:", error);
		// Return 500 status to the webhook caller (which will then notify the user)
		return c.text(
			"Sorry, an internal error occurred while processing your request.",
			500,
		);
	}
});

export default app;
