#!/usr/bin/env node
// Run a browser journey against a verify-outline instance and capture evidence.
//
// Usage:
//   drive.mjs <run-id> <journey.mjs> [--headed] [--fresh] [-- key=value ...]
//
// The journey module default-exports
//   `async ({ page, context, url, step, click, psql, literal, args, log }) => value`
// step(name, page?) saves a numbered screenshot, click(locator) hovers first, psql(sql) returns rows of
// read-only SQL, literal(value) quotes a string for that SQL, args holds the key=value pairs, value
// lands in result.json.
// Cookies persist per run in <run-dir>/browser-state.json, so a journey run
// after `setup-workspace.mjs` is already signed in. --fresh ignores them.
//
// Evidence goes to <evidence>/<journey>-<timestamp>/: numbered step
// screenshots, trace.zip (open with `npx playwright show-trace trace.zip`),
// console.log (page errors and console errors), network.log (failed /api
// calls and every POST to /api), result.json.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const verifySh = path.join(here, "verify-outline.sh");
const root = process.env.OUTLINE_VERIFY_ROOT ?? path.join(os.homedir(), ".cache/outline-verify");

const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
const flags = sep === -1 ? argv : argv.slice(0, sep);
const extra = sep === -1 ? [] : argv.slice(sep + 1);
const [runId, journeyPath] = flags.filter((a) => !a.startsWith("--"));
const headed = flags.includes("--headed");
const fresh = flags.includes("--fresh");
if (!runId || !journeyPath) {
  console.error("usage: drive.mjs <run-id> <journey.mjs> [--headed] [--fresh] [-- key=value ...]");
  process.exit(2);
}
const args = Object.fromEntries(extra.map((kv) => kv.split(/=(.*)/s).slice(0, 2)));

const runDir = path.join(root, "runs", runId);
const stateFile = path.join(runDir, "state.env");
if (!fs.existsSync(stateFile)) {
  console.error(`no run '${runId}' (${stateFile}); start one with verify-outline.sh up`);
  process.exit(2);
}
const state = Object.fromEntries(
  fs
    .readFileSync(stateFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split(/=(.*)/s).slice(0, 2))
);
const url = state.URL;

/** Newest directory entry matching a pattern, or undefined. */
function newest(dir, re) {
  if (!fs.existsSync(dir)) {
    return undefined;
  }
  return fs
    .readdirSync(dir)
    .filter((d) => re.test(d))
    .map((d) => path.join(dir, d))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

function loadPlaywright() {
  const candidates = [
    process.env.OUTLINE_VERIFY_PLAYWRIGHT,
    path.join(state.SRC ?? "", "node_modules/playwright-core"),
    path.join(state.SRC ?? "", "node_modules/playwright"),
  ];
  const npx = path.join(os.homedir(), ".npm/_npx");
  if (fs.existsSync(npx)) {
    for (const d of fs.readdirSync(npx)) {
      candidates.push(path.join(npx, d, "node_modules/playwright-core"));
    }
  }
  const require = createRequire(import.meta.url);
  for (const c of candidates) {
    if (c && fs.existsSync(path.join(c, "package.json"))) {
      return { lib: require(c), from: c };
    }
  }
  throw new Error(
    "playwright-core not found; set OUTLINE_VERIFY_PLAYWRIGHT=/path/to/node_modules/playwright-core"
  );
}

function findChrome() {
  if (process.env.OUTLINE_VERIFY_CHROME) {
    return process.env.OUTLINE_VERIFY_CHROME;
  }
  const cache =
    process.platform === "darwin"
      ? path.join(os.homedir(), "Library/Caches/ms-playwright")
      : path.join(os.homedir(), ".cache/ms-playwright");
  const dir = newest(cache, /^chromium-\d+$/);
  if (!dir) {
    return undefined;
  }
  const options = [
    "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-linux64/chrome",
    "chrome-linux/chrome",
  ].map((p) => path.join(dir, p));
  return options.find((p) => fs.existsSync(p));
}

const journeyName = path.basename(journeyPath).replace(/\.m?js$/, "");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(state.EVIDENCE, `${journeyName}-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

const { lib, from } = loadPlaywright();
const executablePath = findChrome();
const browser = await lib.chromium.launch({ headless: !headed, executablePath });
const storage = path.join(runDir, "browser-state.json");
const context = await browser.newContext({
  baseURL: url,
  viewport: { width: 1400, height: 900 },
  storageState: !fresh && fs.existsSync(storage) ? storage : undefined,
});
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();

const consoleLines = [];
const networkLines = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    consoleLines.push(`[${m.type()}] ${m.text()}`);
  }
});
page.on("pageerror", (e) => consoleLines.push(`[pageerror] ${e.stack ?? e.message}`));
page.on("response", (r) => {
  const u = r.url();
  if (!u.startsWith(url) || !u.includes("/api/")) {
    return;
  }
  const method = r.request().method();
  if (r.status() >= 400 || method === "POST") {
    networkLines.push(`${r.status()} ${method} ${u.slice(url.length)}`);
  }
});

let n = 0;
const steps = [];
/** Screenshot a page (default: the journey page) as a numbered evidence step. */
async function step(name, target = page) {
  n += 1;
  const file = `${String(n).padStart(2, "0")}-${name.replace(/[^a-z0-9-]+/gi, "-")}.png`;
  await target.screenshot({ path: path.join(outDir, file) });
  steps.push(file);
  console.log(`  step ${file}`);
}
/**
 * Click like a person: hover, pause, click. Sidebar links and document rows
 * re-render on pointerenter, which swallows an instant Playwright click.
 */
async function click(locator) {
  await locator.hover();
  await page.waitForTimeout(300);
  await locator.click();
}
/** Run read-only SQL against the instance database, returning trimmed rows. */
function psql(sql) {
  return execFileSync(verifySh, ["psql", runId, sql], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}
/** Quote a string as a SQL literal for psql(). */
function literal(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
const log = (...a) => console.log("  ", ...a);

const journey = (await import(pathToFileURL(path.resolve(journeyPath)).href)).default;
let result = { journey: journeyName, url, ok: false };
console.log(`drive ${journeyName} -> ${url} (playwright ${from}, chrome ${executablePath ?? "default"})`);
try {
  const value = await journey({ page, context, url, step, click, psql, literal, args, log });
  result = { ...result, ok: true, value: value ?? null };
} catch (err) {
  result.error = String(err?.stack ?? err);
  await page.screenshot({ path: path.join(outDir, "FAILED.png") }).catch(() => {});
} finally {
  await context.storageState({ path: storage }).catch(() => {});
  await context.tracing.stop({ path: path.join(outDir, "trace.zip") }).catch(() => {});
  await browser.close();
  result.steps = steps;
  fs.writeFileSync(path.join(outDir, "console.log"), consoleLines.join("\n") + "\n");
  fs.writeFileSync(path.join(outDir, "network.log"), networkLines.join("\n") + "\n");
  fs.writeFileSync(path.join(outDir, "result.json"), JSON.stringify(result, null, 2) + "\n");
}
console.log(`${result.ok ? "PASS" : "FAIL"} ${journeyName}; evidence: ${outDir}`);
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
