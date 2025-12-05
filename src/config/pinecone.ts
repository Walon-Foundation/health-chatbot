import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "./env.js";

const pinecone = new Pinecone({
    apiKey:env.PINE_CONE_API_KEY as string
})

export const pineconeIndex = pinecone.index(env.PINE_CONE_INDEX_NAME as string)