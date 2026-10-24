import fs from "node:fs";
import path from "node:path";

const localesPath = path.join(import.meta.dirname, "locales");
const sourceLocale = "en_US";
const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;

const readTranslations = (locale: string): Record<string, string> =>
  JSON.parse(
    fs.readFileSync(path.join(localesPath, locale, "translation.json"), "utf8")
  );

const getPlaceholders = (text: string) =>
  Array.from(
    new Set(Array.from(text.matchAll(placeholderRegex), (m) => m[1]))
  ).sort();

const source = readTranslations(sourceLocale);
const locales = fs
  .readdirSync(localesPath)
  .filter((locale) => locale !== sourceLocale);

describe("translations", () => {
  it.each(locales)("%s should match the source strings", (locale) => {
    const translations = readTranslations(locale);
    const errors: string[] = [];

    for (const [key, value] of Object.entries(translations)) {
      // Keys that are no longer in the source are unused.
      if (!(key in source)) {
        continue;
      }

      if (value === "") {
        errors.push(`${JSON.stringify(key)} is empty`);
        continue;
      }

      if (value.endsWith("_plural")) {
        errors.push(
          `${JSON.stringify(key)} ends with "_plural": ${JSON.stringify(value)}`
        );
      }

      const expected = JSON.stringify(getPlaceholders(key));
      const actual = JSON.stringify(getPlaceholders(value));
      if (expected !== actual) {
        errors.push(
          `${JSON.stringify(key)} has placeholders ${actual}, expected ${expected}: ${JSON.stringify(value)}`
        );
      }
    }

    expect(errors).toEqual([]);
  });
});
