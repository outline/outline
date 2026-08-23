// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.

import { execSync } from "node:child_process";
import fs from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";

// Read version from package.json or default to 1.0.0
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const appVersion = packageJson.version || "1.0.0";
let commitHash = "unknown";
try {
	commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
	console.warn("Could not get git commit hash", e);
}
// Bundle/build number: total commit count, the standard VCS-derived stand-in
// for a CI auto-incrementing build number when there's no CI pipeline
// assigning one. Monotonically increasing and reproducible from any clone.
let buildNumber = "0";
try {
	buildNumber = execSync("git rev-list --count HEAD").toString().trim();
} catch (e) {
	console.warn("Could not get git commit count", e);
}

export default defineConfig({
	tanstackStart: {
		// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
		// nitro/vite builds from this
		server: { entry: "server" },
	},
	// The installed nitro (3.0.260429-beta) predates the `defaultPreset`
	// auto-detection (3.0.260603-beta+), so without an explicit preset the
	// Cloudflare Worker bundle is built as `node-server` and the deployed
	// Worker crashes on hydration (`t.changeLanguage is not a function`,
	// React #185). Pin the cloudflare-module preset to ship a Workers-
	// compatible bundle. Match the build output dirs to wrangler.toml
	// (`main = "dist/server/index.mjs"`, `assets = { directory = "dist/client" }`).
	nitro: {
		preset: "cloudflare-module",
		output: {
			dir: "dist",
			serverDir: "dist/server",
			publicDir: "dist/client",
		},
		// run_worker_first ensures /_server (TanStack createServerFn) requests
		// are routed to the Worker instead of getting a 404 from the static
		// asset handler when there's no matching file in dist/client.
		cloudflare: { nodeCompat: true, deployConfig: true },
	},
	vite: {
		define: {
			__APP_VERSION__: JSON.stringify(appVersion),
			__COMMIT_HASH__: JSON.stringify(commitHash),
			__BUILD_NUMBER__: JSON.stringify(buildNumber),
		},
		plugins: [
			mdx({
				remarkPlugins: [remarkGfm],
				providerImportSource: "@mdx-js/react",
			}),
		],
		css: {
			transformer: "postcss",
		},
	},
});
