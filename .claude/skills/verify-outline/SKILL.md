---
name: verify-outline
description: Launch an isolated Outline instance (web UI + API, production build, own Postgres/Redis containers) from the current checkout and drive it in a headless browser to prove a user-facing change works, with screenshots, Playwright traces and database checks as evidence. Use when asked to verify, demo, reproduce or screenshot Outline behavior in the real app, rather than only in unit tests.
---

# Verify Outline

Outline is a team knowledge base. The primary surface is the **web app**: a
React SPA served by the Koa server. The other surfaces are the RPC API
(`POST /api/<resource>.<verb>`), the collaboration websocket (Y.js) that saves
editor content, and the MCP server. All of them run in the same server process
that this skill starts.

This skill **never** uses the developer's dev server
(`https://*.outline.dev:3000`, Vite on 3001) or the docker-compose
Postgres/Redis on 5432/6379. They hold the developer's real session and data.
Every run gets its own copy of the source, its own containers, a free port and
an empty database. Many runs can exist side by side.

All commands below run from the repo root. `$V` is this skill's directory:

```bash
V=.claude/skills/verify-outline
```

## Launch

```bash
$V/scripts/verify-outline.sh up my-run      # run-id: [a-z0-9-]+, omit for a timestamped id
```

What it does (about 30s on an M-series Mac):

1. rsyncs the checkout (with uncommitted changes) to
   `~/.cache/outline-verify/runs/<id>/src`. It does not copy `node_modules`,
   `build`, `.git`, `.env*` or the local TLS certs. `node_modules` is symlinked
   from the checkout. The record of what was snapshotted is in `source.txt`.
   Then it checks that every `package.json` dependency is in
   `node_modules`. If not, it stops with `node_modules in … does not match`.
   This happens when Conductor has moved the checkout to another commit:
   run `yarn install` there, or use a checkout that matches.
2. Starts `outline-verify-<id>-pg` (postgres:latest) and
   `outline-verify-<id>-redis` (redis:latest) on random 127.0.0.1 ports.
   It waits for a TCP query to succeed *inside* the container: the image's
   init phase runs a socket-only server, so `pg_isready` passes too early.
3. `node build.js` (SWC server build) and `vite build` (frontend) into the
   snapshot's `build/`.
4. `sequelize db:migrate` on the empty database, including the data
   migrations in `server/scripts/`.
5. Starts `node build/server/index.js --services=web,websockets,collaboration,worker,cron`
   with `NODE_ENV=production`, `URL=http://localhost:<port>`, `FORCE_HTTPS=false`,
   `FILE_STORAGE=local` and random secrets. The repo's `.env` files are
   **not read**, because they hold real S3/OAuth credentials. So uploads stay
   in the run's `storage/` dir and no OAuth providers are enabled.

**Ready** = the script prints `READY http://localhost:<port> (run-id: <id>)`.
This line only prints when `/_health` returns 200 (DB + Redis) **and** `/`
serves the built SPA. The script then prints `info` (URL, evidence dir, log,
DATABASE_URL).

The database is empty. There is no seed data. The first journey must be
`setup-workspace.mjs` (see Drive). It creates the workspace and admin through
the real first-run screen, and saves the session cookie for later journeys.

To test new code, `down` the run and `up` a new one. The snapshot does not
follow later edits. A rebuild without a new DB is not supported.

Requirements: Docker running (colima here), `node_modules` installed in the
checkout, and Playwright's Chromium in `~/Library/Caches/ms-playwright`
(see Drive).

## Doctor

Run this first when anything looks wrong. It is read-only. Exit code 0
means the instance is worth driving.

```bash
$V/scripts/verify-outline.sh doctor my-run
```

It checks the following: the server pid is alive, the port is listened on by
*our* process tree, the server cwd is the snapshot, both containers are
running, `/_health` returns 200, `/` serves the SPA, and there are no pending
migrations. It also prints the team/user counts (0 teams means `/` shows
workspace setup) and the commit plus uncommitted paths in the snapshot.

Other read-only helpers:

```bash
$V/scripts/verify-outline.sh info my-run           # URL, EVIDENCE, SERVER_LOG, DATABASE_URL
$V/scripts/verify-outline.sh logs my-run 200       # tail server log (JSON lines)
$V/scripts/verify-outline.sh psql my-run 'select title from documents'   # read-only transaction
$V/scripts/verify-outline.sh list                  # runs + labelled containers
```

## Drive

The harness is `scripts/drive.mjs`. It runs one journey module in headless
Chromium:

```bash
node $V/scripts/drive.mjs <run-id> <journey.mjs> [--headed] [--fresh] [-- key=value ...]
```

- The journey modules are in `$V/journeys/`. Each default-exports
  `async ({ page, context, url, step, click, psql, literal, args, log }) => value`.
  `page` already has `baseURL` set, so `page.goto("/home")` works.
  `step(name, page?)` saves a numbered screenshot. `click(locator)`
  moves the pointer over the element, waits, then clicks (see the rules below). `psql(sql)` returns rows
  (`a|b|c`). Put values into SQL with `literal(value)`, never raw. `value` is written to `result.json`.
- The session persists per run in `runs/<id>/browser-state.json`. `--fresh`
  starts signed out.
- Browser lookup: `OUTLINE_VERIFY_PLAYWRIGHT` (path to a playwright-core
  package), else `node_modules/playwright-core`, else the newest
  `~/.npm/_npx/*/node_modules/playwright-core` (the Playwright MCP server's
  copy). Chromium: `OUTLINE_VERIFY_CHROME`, else the newest
  `ms-playwright/chromium-*` build. The playwright-core version and the cached
  Chromium build do not need to match. The Playwright **MCP** tools are set
  to use the `chrome` channel, which is not installed here, so they fail.
  Use drive.mjs.

The journeys that ship with the skill (see `features/` for what each proves):

```bash
node $V/scripts/drive.mjs my-run $V/journeys/setup-workspace.mjs              # always first
node $V/scripts/drive.mjs my-run $V/journeys/create-collection.mjs -- name="Proof"
node $V/scripts/drive.mjs my-run $V/journeys/create-document.mjs -- collection="Proof"
node $V/scripts/drive.mjs my-run $V/journeys/search.mjs -- query=<word> expect="<title>"
node $V/scripts/drive.mjs my-run $V/journeys/share-public.mjs -- doc=/doc/<slug> expect="<body text>"
```

`create-document` returns `title`, `body` (with a letters-only marker) and
`url` in `result.json`. Feed them into `search` and `share-public`:

```bash
R=$(ls -td ~/.cache/outline-verify/evidence/my-run/create-document-*/ | head -1)result.json
node $V/scripts/drive.mjs my-run $V/journeys/search.mjs -- query="$(jq -r '.value.title|split(" ")|last' $R)" expect="$(jq -r .value.title $R)"
node $V/scripts/drive.mjs my-run $V/journeys/share-public.mjs -- doc="$(jq -r .value.url $R | sed 's|^http://localhost:[0-9]*||')" expect="$(jq -r .value.body $R)"
```

To verify a change, write a new journey next to these (copy the closest one).
Use stable handles that exist in this app:

- ARIA names: `button "New collection"`, `dialog "Create a collection"`,
  `textbox "Document title"`, `textbox "Editor content"`,
  `button "Share"` → `dialog "Share"` → `switch "Publish to internet"`,
  `searchbox "Search…"`, sidebar `link "Expand <collection>"`,
  `link "Search"`, `main` → `link "New doc"` (scope it: the sidebar's
  Personal section has another `button "New doc"`),
  `button "Account"`, `button "Document options"`.
- Routes: `/home`, `/search`, `/drafts`, `/collection/<slug>-<urlId>`,
  `/doc/<slug>-<urlId>`, `/s/<shareId>` (public), `/settings/*`.
- To find more handles, dump `await page.locator("body").ariaSnapshot()` in a
  scratch journey. Do not rely on a `main` landmark: some pages, such as a
  collection while it loads or search, do not have one.

Interaction rules that matter here:

- **Use `click(locator)`, not `locator.click()`**, for sidebar items, header
  buttons and list rows. `SidebarLink` and document rows re-render on
  `pointerenter` (deferred menus, selection checkbox). Playwright's instant
  move-and-click then loses the first click: nothing opens and no error shows.
- Type into the editor with `page.keyboard.type` after you click the title
  or editor. In the title, `Enter` moves the cursor to the body.
- The body saves over the collaboration websocket, not the API. Poll the DB
  (`documents.content::text`) for up to ~30s instead of trusting the screen.
- API-only checks: `curl -s -X POST $URL/api/<method> -H 'Content-Type: application/json' -H "Authorization: Bearer <key>" -d '{}'`.
  Create the key in the UI (`/settings/api-and-access`, "API & Access") so that the key also
  comes from a real path.

## Evidence

Evidence goes to `~/.cache/outline-verify/evidence/<run-id>/`, which is
**outside** the run dir and survives `down`. Each journey writes
`<journey>-<timestamp>/` with:

- `01-*.png, 02-*.png …` numbered screenshots of the action and the resulting
  state, and `FAILED.png` on failure
- `trace.zip`: the full Playwright trace (DOM snapshots + screenshots per
  action). Open it with `npx playwright show-trace trace.zip`.
- `console.log`: page errors and console errors/warnings
- `network.log`: every failed `/api` call and every API POST with its status
- `result.json`: pass/fail, error stack, returned value, and the step list

The run-level files are `source.txt` (commit + uncommitted paths under test)
and `server.log`, which `down` copies.

Proof standards:

- Drive the real user path: click what a user clicks. Do not call internal
  store setters, `developer.*` endpoints or test factories. `psql` is
  read-only and only for asserting side effects.
- Capture the action and the result: a screenshot before the submit and
  after it, plus the reload or the fresh context that shows persistence.
- Verify side effects, not only pixels: rows in Postgres (`psql`), files in
  `runs/<id>/storage` for uploads, and `network.log` for API status codes.
  For things that are visible to others (shares, permissions), check from a
  second, signed-out or other-user browser context (see `share-public.mjs`).
- Read `console.log` and `network.log`. A green journey with a 500 or a
  pageerror in the log is not a pass.
- No mocks: the instance is real end to end. External integrations (Slack,
  Google, S3, SMTP) are not configured at all. A journey that needs one must
  report that it cannot be verified here. It must not stub the integration.
- The rate limits are real (only the global per-IP limit is raised). Do not
  disable the limits to make a journey pass.
- If a feature lists several entry points in `features/`, a proof that
  drives only one of them is incomplete. Say which entry points you covered.

## Cleanup

```bash
$V/scripts/verify-outline.sh down my-run
```

This kills the server process tree recorded in `server.pid` (never by
name). It removes the two containers, copies `server.log` to the evidence
dir, and deletes `runs/<id>` (snapshot, DB, storage, cookies). It then lists
the evidence dir to show that the evidence is still there. If the port
still has a listener afterwards, it prints a warning. Inspect it with `lsof`
and do not kill it blindly. Run `down` after **every** run, including
failed `up` attempts (`up` writes state before the slow steps, so `down`
always works). `list` shows any runs that you left behind.

To delete the evidence itself, remove
`~/.cache/outline-verify/evidence/<run-id>`, but only when the user asks.

## Helpers

| Script | Invocation |
| --- | --- |
| `scripts/verify-outline.sh` | `up [id]`, `doctor <id>`, `info <id>`, `logs <id> [n]`, `psql <id> '<sql>'`, `down <id>`, `list` |
| `scripts/drive.mjs` | `node scripts/drive.mjs <id> <journey.mjs> [--headed] [--fresh] [-- k=v ...]` |
| `journeys/*.mjs` | see Drive; one file per user journey, args via `-- k=v` |

Environment overrides: `OUTLINE_VERIFY_ROOT` (default
`~/.cache/outline-verify`), `OUTLINE_REPO` (the checkout to snapshot; default
is the git toplevel of the cwd), `OUTLINE_VERIFY_PG_IMAGE`,
`OUTLINE_VERIFY_REDIS_IMAGE`, `OUTLINE_VERIFY_PLAYWRIGHT`,
`OUTLINE_VERIFY_CHROME`.

## Conductor caveat

`~/Projects/outline` is mirrored and reset by Conductor from other
worktrees. It can carry another agent's uncommitted diff, and untracked files
there can disappear. Run `up` from the worktree that has your change.
`source.txt` shows exactly what was snapshotted, so check it before you
claim that a run tested your change.
