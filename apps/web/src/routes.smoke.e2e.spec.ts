import { expect, test } from "@playwright/test";

test("renders the Petso landing page", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveTitle(/Petso|Peso/i);
	await expect(page.getByRole("link", { name: /login|masuk/i })).toBeVisible();
});

test("renders the authentication entry point", async ({ page }) => {
	await page.goto("/login");

	await expect(page).toHaveTitle(/login|masuk/i);
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await expect(page.getByRole("link", { name: /signup|daftar/i })).toBeVisible();
});
