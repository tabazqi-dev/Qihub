import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();

export default defineConfig(
  databaseUrl
    ? {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        schemaFilter: ["public"],
        dbCredentials: {
          url: databaseUrl,
        },
        verbose: true,
      }
    : {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        schemaFilter: ["public"],
        dbCredentials: {
          host: process.env.SQL_HOST || "localhost",
          user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || "postgres",
          password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || "",
          database: process.env.SQL_DB_NAME || "postgres",
          ssl: false,
        },
        verbose: true,
      }
);
