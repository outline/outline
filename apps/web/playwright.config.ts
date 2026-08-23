import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./src",
	testMatch: "**/*.e2e.spec.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:8081",
		trace: "on",
		video: "on",
		screenshot: "on",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run dev -- --port 8081",
		url: "http://localhost:8081",
		reuseExistingServer: true,
		timeout: 120 * 1000,
		env: {
			...process.env,
		},
	},
});
