import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

neonConfig.webSocketConstructor = ws;

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
neonConfig.poolQueryViaFetch = true;

// console.log(env.DATABASE_URL)

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });