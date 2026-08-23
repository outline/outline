import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/infra/db/drizzle/schema.ts",
	out: "./src/infra/db/drizzle/migrations",
	dbCredentials: {
		// biome-ignore lint/style/noNonNullAssertion: drizzle-kit dijalankan manual dengan env yang sudah diverifikasi
		url: process.env.DATABASE_URL!,
	},
	casing: "snake_case",
});
