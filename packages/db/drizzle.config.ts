import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_DIRECT or DATABASE_URL must be set");

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
