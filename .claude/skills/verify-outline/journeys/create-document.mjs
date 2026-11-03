// Create a document in a collection through the editor, then prove the title
// and body persisted (reload + database).
// Args: collection= (name of an existing collection, required), title=, body=.
// The editor applies input rules such as smart quotes to body=, so the checks
// use the text that the editor shows.
export default async ({ page, click, step, psql, literal, args, log }) => {
  if (!args.collection) {
    throw new Error("collection= is required; run create-collection.mjs first");
  }
  // Letters only: Postgres parses "verify-123" as a negative number token, so
  // a numeric marker can never be found through search.
  const marker = `verify${Array.from({ length: 8 }, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]).join("")}`;
  const title = args.title ?? `Verify Doc ${marker}`;
  const typed = args.body ?? `Body text ${marker}`;

  await page.goto("/home");
  await page.waitForLoadState("networkidle");
  const coll = page.getByRole("link", { name: `Expand ${args.collection}` });
  await click(coll);
  await page.waitForURL(/\/collection\//);

  // Scope to main: the sidebar has its own "New doc" for the Personal section.
  const header = page.getByRole("main");
  const newDoc = header.getByRole("link", { name: "New doc" }).or(header.getByRole("button", { name: "New doc" })).first();
  await click(newDoc);
  await page.waitForURL(/\/doc\//);

  const titleBox = page.getByRole("textbox", { name: "Document title" });
  await titleBox.click();
  await page.keyboard.type(title);
  await page.keyboard.press("Enter");
  await page.keyboard.type(typed);
  const body = (await page.getByRole("textbox", { name: "Editor content" }).locator("p").first().innerText()).trim();
  if (body !== typed) {
    log("editor changed body to:", body);
  }
  await step("typed");

  // Title saves over the API, body over the collaboration websocket; poll the DB.
  // jsonb text escapes strings as JSON does, so search for the escaped body.
  const escapedBody = JSON.stringify(body).slice(1, -1);
  let row = [];
  for (let i = 0; i < 30; i++) {
    row = psql(
      `select title, "publishedAt" is not null, strpos(content::text, ${literal(escapedBody)}) > 0 from documents where title = ${literal(title)} and "deletedAt" is null`
    );
    if (row[0]?.endsWith("|t|t")) {
      break;
    }
    await page.waitForTimeout(1000);
  }
  log("db:", row);
  if (row[0] !== `${title}|t|t`) {
    throw new Error(`document not persisted as published with body: ${JSON.stringify(row)}`);
  }

  const docUrl = page.url();
  await page.reload();
  // While loading, a read-only editor and the collaborative editor can both be
  // in the DOM; wait for exactly one visible copy so real duplication fails.
  const copies = page.getByRole("textbox", { name: "Editor content" }).getByText(body).filter({ visible: true });
  await copies.first().waitFor();
  for (let i = 0; i < 20 && (await copies.count()) !== 1; i++) {
    await page.waitForTimeout(500);
  }
  if ((await copies.count()) !== 1) {
    throw new Error(`body visible ${await copies.count()} times after reload`);
  }
  const shownTitle = await page.getByRole("textbox", { name: "Document title" }).innerText();
  if (shownTitle.trim() !== title) {
    throw new Error(`title after reload is ${JSON.stringify(shownTitle)}`);
  }
  await step("after-reload");
  return { title, body, url: docUrl };
};
