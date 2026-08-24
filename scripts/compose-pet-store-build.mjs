import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const outlineBuild = resolve(root, "build/app");
const workerClient = resolve(root, "apps/web/dist/client");

if (!existsSync(resolve(root, "apps/web/dist/server/index.mjs"))) {
  throw new Error("Pet Store API build is missing.");
}
if (!existsSync(resolve(outlineBuild, "index.html"))) {
  throw new Error("Outline frontend build is missing.");
}

rmSync(workerClient, { recursive: true, force: true });
cpSync(outlineBuild, workerClient, { recursive: true });
