import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["src/**/*.test.{ts,tsx}"],
		exclude: ["node_modules", "dist", ".git", ".cache"],
	},
});
