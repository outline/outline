import { defineConfig } from "vite";

/**
 * Storybook's own Vite config.
 *
 * The repository root `vite.config.ts` builds the Outline client and expects
 * build-time globals that Storybook does not provide, so the preview is built
 * from this minimal config instead. Plugins and aliases are added in
 * `.storybook/main.ts`.
 */
export default defineConfig({});
