import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const sourceRoot = resolve("shared/i18n/locales");
const destinationRoot = resolve("public/locales");

mkdirSync(destinationRoot, { recursive: true });

for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  copyFileSync(
    resolve(sourceRoot, entry.name, "translation.json"),
    resolve(destinationRoot, `${entry.name}.json`)
  );
}
