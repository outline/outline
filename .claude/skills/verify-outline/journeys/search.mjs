// Search for a word from the sidebar Search page and open the matching result.
// Args: query= (a letters-only word, required), expect= (title the results must
// include, required).
export default async ({ page, click, step, args, log }) => {
  if (!args.query || !args.expect) {
    throw new Error("query= and expect= are required");
  }
  await page.goto("/home");
  await page.waitForLoadState("networkidle");
  const nav = page.getByRole("link", { name: "Search", exact: true });
  await click(nav);
  await page.waitForURL(/\/search/);

  const box = page.getByRole("searchbox", { name: "Search…" });
  await box.fill(args.query);
  await box.press("Enter");

  const result = page.getByRole("link", { name: new RegExp(args.expect.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).last();
  await result.waitFor({ timeout: 10000 });
  await step("results");
  log("results url:", page.url());

  await click(result);
  await page.waitForURL(/\/doc\//);
  const title = await page.getByRole("textbox", { name: "Document title" }).innerText();
  if (title.trim() !== args.expect) {
    throw new Error(`opened ${JSON.stringify(title)} instead of ${args.expect}`);
  }
  await step("opened-result");
  return { query: args.query, opened: page.url() };
};
