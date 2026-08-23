import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	build: {
		lib: {
			entry: "src/index.ts",
			formats: ["es"],
			fileName: "index",
		},
		rollupOptions: {
			external: [
				"react",
				"react-dom",
				"react/jsx-runtime",
				"@tanstack/react-query",
				"@tanstack/react-router",
				"recharts",
				"embla-carousel-react",
				"framer-motion",
				"@radix-ui/*",
				"clsx",
				"tailwind-merge",
				"class-variance-authority",
				"i18next",
				"react-i18next",
				"date-fns",
				"lucide-react",
				"zod",
			],
			output: {
				globals: {},
			},
		},
	},
});