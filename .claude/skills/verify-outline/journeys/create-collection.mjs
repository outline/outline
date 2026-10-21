// Create a collection from the sidebar "New collection" dialog.
// Args: name= (default "Verify Collection <time>").
export default async ({ page, click, step, psql, literal, args, log }) => {
  const name = args.name ?? `Verify Collection ${Date.now()}`;

  await page.goto("/home");
  await page.waitForLoadState("networkidle");
  const open = page.getByRole("button", { name: "New collection" });
  await click(open);

  const dialog = page.getByRole("dialog", { name: "Create a collection" });
  await dialog.waitFor();
  // The name input has no accessible label; it is the only textbox.
  await dialog.getByRole("textbox").fill(name);
  await step("create-collection-dialog");
  await dialog.getByRole("button", { name: "Create" }).click();

  await page.waitForURL(/\/collection\//);
  await page.getByRole("link", { name: `Expand ${name}` }).waitFor();
  await step("collection-page");

  const rows = psql(`select name from collections where name = ${literal(name)} and "deletedAt" is null`);
  log("db:", rows);
  if (rows.length !== 1) {
    throw new Error(`expected 1 collection row named ${name}, got ${rows.length}`);
  }
  return { name, url: page.url() };
};
