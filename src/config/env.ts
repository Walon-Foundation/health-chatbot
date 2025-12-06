import z from "zod";
import "dotenv/config"


const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]),
  PINE_CONE_API_KEY: z.string().min(1),
  PINE_CONE_INDEX_NAME: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  WASENDER_API_KEY: z.string().min(1),
  OPENAI_API_KEY:z.string().min(1),
  API_URL:z.string().min(1)
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PINE_CONE_API_KEY: process.env.PINE_CONE_API_KEY,
  PINE_CONE_INDEX_NAME: process.env.PINE_CONE_INDEX_NAME,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  WASENDER_API_KEY: process.env.WASENDER_API_KEY,
  OPENAI_API_KEY:process.env.OPENAI_API_KEY,
  API_URL:process.env.API_URL
});