import { OpenAI } from "openai";
import { env } from "./env.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function getEmbedding(input: string): Promise<number[]> {
	const response = await openai.embeddings.create({
		input,
		model: "text-embedding-3-small",
		encoding_format: "float",
		dimensions: 1024,
	});

	return response.data[0].embedding;
}
