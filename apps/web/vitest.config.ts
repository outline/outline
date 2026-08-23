import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		exclude: ["node_modules", "dist", ".git", ".cache", ".opencode"],
		server: {
			deps: {
				external: ["effect"],
			},
		},
		coverage: {
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/**/*.test.{ts,tsx}", "src/test/setup.ts"],
		},
	},
	esbuild: {
		target: "esnext",
	},
});
