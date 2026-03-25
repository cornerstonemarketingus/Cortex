// Keep Prisma's generated config shape. If your project used defineConfig, pick that form.
// This file points Prisma to the schema used above.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // prefer DATABASE_URL in production, fallback to SQLite dev DB
    url: process.env["DATABASE_URL"] ?? "file:./dev.db",
  },
});
