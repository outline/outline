// First-run workspace setup on an empty instance: the real self-hosted
// onboarding form that POSTs /api/installation.create and signs the admin in.
// Args: team=, name=, email= (defaults below).
export default async ({ page, step, psql, args, log }) => {
  const team = args.team ?? "Verify Co";
  const name = args.name ?? "Vera Admin";
  const email = args.email ?? "admin@verify.test";

  if (psql("select count(*) from teams")[0] !== "0") {
    throw new Error("instance already has a team; setup only runs on a fresh instance");
  }
  await page.goto("/");
  await page.getByLabel("Workspace name").fill(team);
  await page.getByLabel("Admin name").fill(name);
  await page.getByLabel("Admin email").fill(email);
  await step("setup-form-filled");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.waitForURL(/\/home/, { timeout: 20000 });
  await page.getByRole("navigation").first().waitFor();
  await step("signed-in-home");

  const rows = psql(
    `select t.name, u.email, u.role from teams t join users u on u."teamId" = t.id`
  );
  log("db:", rows);
  if (rows.length !== 1 || rows[0] !== `${team}|${email}|admin`) {
    throw new Error(`unexpected team/user rows: ${JSON.stringify(rows)}`);
  }
  return { team, email, rows };
};
