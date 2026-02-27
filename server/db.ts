import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket to accept self-signed certificates (development only)
// Create a custom WebSocket class that doesn't validate SSL certificates
class CustomWebSocket extends ws {
  constructor(address: any, protocols?: any, options?: any) {
    const customOptions = {
      ...(typeof options === 'object' ? options : {}),
      rejectUnauthorized: false
    };
    super(address, protocols, customOptions);
  }
}

neonConfig.webSocketConstructor = CustomWebSocket as any;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
