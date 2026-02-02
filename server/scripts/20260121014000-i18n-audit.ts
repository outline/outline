import { readFileSync } from "fs";
import path from "path";

type Translation = Record<string, string>;

const LOCALES = ["en_US", "ru_RU", "kk_KZ"] as const;
const baseLocale = "en_US";

function readLocale(locale: string): Translation {
  const filePath = path.join(
    __dirname,
    "../../shared/i18n/locales",
    locale,
    "translation.json"
  );
  return JSON.parse(readFileSync(filePath, "utf8")) as Translation;
}

function diffKeys(base: Translation, target: Translation) {
  const baseKeys = Object.keys(base);
  const targetKeys = new Set(Object.keys(target));
  return baseKeys.filter((key) => !targetKeys.has(key));
}

function emptyKeys(target: Translation) {
  return Object.entries(target)
    .filter(([, value]) => !value || value.trim().length === 0)
    .map(([key]) => key);
}

export default function main() {
  const base = readLocale(baseLocale);
  const report: Record<string, { missing: string[]; empty: string[] }> = {};

  for (const locale of LOCALES) {
    if (locale === baseLocale) {
      continue;
    }
    const target = readLocale(locale);
    report[locale] = {
      missing: diffKeys(base, target),
      empty: emptyKeys(target),
    };
  }

  console.log("Translation audit (compared to en_US):");
  for (const [locale, data] of Object.entries(report)) {
    console.log(`\n${locale}:`);
    console.log(`  missing: ${data.missing.length}`);
    console.log(`  empty: ${data.empty.length}`);
    data.missing.slice(0, 50).forEach((key) => console.log(`    - ${key}`));
    if (data.missing.length > 50) {
      console.log(`    ...and ${data.missing.length - 50} more`);
    }
  }
}

if (process.env.NODE_ENV !== "test") {
  main();
}
