// Search date range: pick a custom range for Updated from More, check the URL, chip, request and
// results, then reopen the dialog and pick a range with no results.
// Args: query= (a word in the title of a document updated this month, required).
export default async ({ page, click, step, args }) => {
  const bodies = [];
  page.on("request", (req) => {
    if (req.url().endsWith("/api/documents.search")) {
      bodies.push(req.postDataJSON());
    }
  });
  const dayButton = (month, day) =>
    page.getByRole("dialog").locator("table").nth(month).locator(`button:text-is("${day}")`).first();

  await page.goto(`/search?q=${args.query}`);
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  await click(page.getByRole("button", { name: "More filters" }));
  await click(page.getByRole("menuitem", { name: "Updated", exact: true }));
  await page.getByRole("menu").waitFor();
  await step("updated-options");
  await click(page.getByRole("menuitem", { name: "Custom…" }));
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
  await step("dialog-open");

  const today = new Date().getDate();
  await click(dayButton(1, 1));
  await click(dayButton(1, today));
  await step("range-picked");
  await click(page.getByRole("button", { name: "Apply" }));
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.waitForURL(/updatedAt\.gte=\d{4}-\d{2}-01&updatedAt\.lte=\d{4}-\d{2}-\d{2}/);
  await page.getByRole("link", { name: new RegExp(args.query) }).last().waitFor();
  const chipText = await page.getByRole("button", { name: /^Updated/ }).innerText();
  const sent = bodies.at(-1)?.filters?.find((f) => f.operator === "AND" || f.field === "updatedAt");
  await step("range-applied");

  // Reopen: Custom is selected and the dialog shows the current range.
  await click(page.getByRole("button", { name: /^Updated/ }));
  await page.getByRole("menu").waitFor();
  await step("reopen-menu");
  await click(page.getByRole("menuitem", { name: "Custom…" }));
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
  const summary = await page.getByRole("dialog").locator("form span").first().innerText();
  await step("reopen-dialog");

  // A new range in the previous month has no results.
  await click(dayButton(0, 1));
  await click(dayButton(0, 2));
  const newSummary = await page.getByRole("dialog").locator("form span").first().innerText();
  await click(page.getByRole("button", { name: "Apply" }));
  await page.getByText("No documents found for your search filters.").waitFor();
  await step("empty-range");

  const emptyChip = await page.getByRole("button", { name: /^Updated/ }).innerText();
  return { url: page.url(), chipText, sent, summary, newSummary, emptyChip };
};
