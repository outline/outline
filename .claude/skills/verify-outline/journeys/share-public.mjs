// Publish a document to the web from the Share dialog, then open the public
// link in a signed-out browser context and read the content.
// Args: doc= (document path such as /doc/slug-id, required), expect= (body text
// the public page must show, required).
export default async ({ page, click, context, step, psql, literal, args, log }) => {
  if (!args.doc || !args.expect) {
    throw new Error("doc= and expect= are required");
  }
  await page.goto(args.doc);
  await page.waitForLoadState("networkidle");
  const docId = args.doc.split("-").pop();

  const share = page.getByRole("button", { name: "Share", exact: true });
  await click(share);
  const dialog = page.getByRole("dialog", { name: "Share" });
  const toggle = dialog.getByRole("switch", { name: "Publish to internet" });
  if ((await toggle.getAttribute("aria-checked")) === "true") {
    throw new Error("document is already published to the web; use a fresh document");
  }
  await toggle.click();
  await page.waitForFunction(
    () => document.querySelector('[role=switch][aria-checked="true"]') !== null
  );
  await step("share-dialog-published");

  const rows = psql(
    `select s.id, s.published from shares s join documents d on d.id = s."documentId" where d."urlId" = ${literal(docId)} and s."revokedAt" is null`
  );
  log("db:", rows);
  const [shareId, published] = (rows[0] ?? "").split("|");
  if (published !== "t") {
    throw new Error(`no published share row for ${docId}: ${JSON.stringify(rows)}`);
  }

  const anon = await context.browser().newContext({ baseURL: page.url() });
  try {
    const pub = await anon.newPage();
    await pub.goto(`/s/${shareId}`);
    // Scope to main: the server also renders a screen-reader-only copy.
    await pub.getByRole("main").getByText(args.expect).first().waitFor({ timeout: 15000 });
    const cookies = (await anon.cookies()).map((c) => c.name);
    if (cookies.includes("accessToken")) {
      throw new Error("anonymous context unexpectedly holds an accessToken");
    }
    await step("public-page-signed-out", pub);
    log("public page url:", pub.url());
    return { shareUrl: `/s/${shareId}`, publicUrl: pub.url() };
  } finally {
    await anon.close();
  }
};
