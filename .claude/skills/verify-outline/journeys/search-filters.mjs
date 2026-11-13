// Drive the search filter bar: pinned chips, the "Filter" add menu, a pending
// chip that opens its options, a toggle filter, and removing a filter.
// Args: query= (a word in a document title, required), collection= (required).
export default async ({ page, click, step, args, log, psql, literal }) => {
  if (!args.query || !args.collection) {
    throw new Error("query= and collection= are required");
  }
  await page.goto("/search");
  await page.waitForLoadState("networkidle");
  await step("empty");

  // Every filter is available before a query is typed.
  for (const name of [/^Collection$/, /^Edited by$/, /^Status/]) {
    await page.getByRole("button", { name }).waitFor();
  }
  await click(page.getByRole("button", { name: "More filters" }));
  for (const name of ["Updated", "Created by", "Created", "Template", "Title only"]) {
    await page.getByRole("menuitem", { name, exact: true }).waitFor();
  }
  await step("empty-add-menu");
  await page.keyboard.press("Escape");

  // A filter alone, with no query, lists results.
  await click(page.getByRole("button", { name: "More filters" }));
  await click(page.getByRole("menuitem", { name: "Updated", exact: true }));
  await click(page.getByRole("menuitem", { name: "Past week" }));
  await page.waitForURL(/dateFilter=week/);
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await step("filter-without-query");
  await click(page.getByRole("button", { name: "Remove filter" }));
  await page.waitForURL((url) => !url.search.includes("dateFilter"));

  // A toggle filter alone, with no query, lists results.
  await click(page.getByRole("button", { name: "More filters" }));
  await click(page.getByRole("menuitem", { name: "Title only" }));
  await page.waitForURL(/titleFilter=true/);
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await step("title-only-without-query");
  await click(page.getByRole("button", { name: "Remove filter" }));
  await page.waitForURL((url) => !url.search.includes("titleFilter"));

  // A document scope alone, with no query, lists results.
  const [documentId] = await psql(
    `select id from documents where title like ${literal(`%${args.query}%`)}`
  );
  await page.goto(`/search?documentId=${documentId}`);
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await step("document-scope-without-query");
  await page.goto("/search");

  const box = page.getByRole("searchbox");
  await box.fill(args.query);
  await box.press("Enter");
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await step("results");

  // Pinned chip: pick a collection.
  await click(page.getByRole("button", { name: "Collection", exact: true }));
  await click(page.getByRole("menuitem", { name: args.collection }));
  await page.waitForURL(/collectionId=/);
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await step("collection-chip");

  // Extra filter: add "Created by", its options open on their own.
  await click(page.getByRole("button", { name: "More filters" }));
  await step("add-menu-open");
  await click(page.getByRole("menuitem", { name: "Created by" }));
  const menu = page.getByRole("menu");
  await menu.waitFor({ timeout: 5000 });
  await step("created-by-options-open");
  await click(menu.getByRole("menuitem").first());
  await page.waitForURL(/createdById=/);
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await step("created-by-chip");

  // Toggle filter: "Title only" adds a chip with no options.
  await click(page.getByRole("button", { name: "More filters" }));
  await click(page.getByRole("menuitem", { name: "Title only" }));
  await page.waitForURL(/titleFilter=true/);
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await step("title-only-chip");

  // Add a filter, then close its options without a value: the chip goes away.
  await click(page.getByRole("button", { name: "More filters" }));
  await click(page.getByRole("menuitem", { name: "Template" }));
  await page.getByRole("menu").waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.getByRole("menu").waitFor({ state: "detached", timeout: 5000 });
  const templateChips = await page
    .getByRole("button", { name: /^Template/ })
    .count();
  if (templateChips !== 0) {
    throw new Error("pending Template chip stayed after closing with no value");
  }
  await step("pending-chip-removed");

  // Remove filters with their × buttons.
  const removeButtons = page.getByRole("button", { name: "Remove filter" });
  const before = await removeButtons.count();
  await click(removeButtons.last());
  await page.waitForURL((url) => !url.search.includes("titleFilter"));
  const after = await removeButtons.count();
  if (after !== before - 1) {
    throw new Error(`expected ${before - 1} remove buttons, saw ${after}`);
  }
  await step("title-only-removed");

  await page.reload();
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await step("after-reload");
  const finalUrl = page.url();
  log("final url:", finalUrl);

  // Narrow viewport: chips wrap and sort moves to the header.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await step("mobile");
  await page.setViewportSize({ width: 1280, height: 800 });

  // Drafts and Trash reuse the shared option hooks.
  await page.goto("/drafts");
  await page.getByRole("button", { name: "Any collection" }).waitFor();
  await click(page.getByRole("button", { name: "Any collection" }));
  await page.getByRole("menuitem", { name: args.collection }).waitFor();
  await step("drafts-collection-filter");
  await page.keyboard.press("Escape");
  await page.goto("/trash");
  await page.getByRole("button", { name: "Any time" }).waitFor();
  await step("trash-filters");
  return { url: finalUrl };
};
