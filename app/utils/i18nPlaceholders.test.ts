import { describe, expect, it } from "vitest";

// Load every locale that ships with the app, including en_US which acts as
// the source of truth for interpolation variables.
const localeFiles = import.meta.glob("../../shared/i18n/locales/*/translation.json", {
  eager: true,
}) as Record<string, Record<string, string>>;

const locales: Record<string, Record<string, string>> = {};
for (const [path, data] of Object.entries(localeFiles)) {
  const locale = path.split("/").slice(-2, -1)[0];
  locales[locale] = data;
}

const en = locales["en_US"];

const DOUBLE_BRACE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const SINGLE_BRACE = /(?<!\{)\{\s*([^{}]+?)\s*\}(?!\})/g;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function extract(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

describe("locale placeholder integrity", () => {
  Object.entries(locales).forEach(([locale, strings]) => {
    if (locale === "en_US") {
      return;
    }
    it(`${locale} interpolation placeholders match the source strings`, () => {
      const problems: string[] = [];

      for (const [key, translation] of Object.entries(strings)) {
        const source =
          en[key] ?? en[key.replace(/_plural$/, "")] ?? undefined;
        if (!source || typeof translation !== "string") {
          continue;
        }
        const sourceVars = extract(source, DOUBLE_BRACE);

        // "{ x }" where the source interpolates "{{ x }}" renders literally.
        for (const name of extract(translation, SINGLE_BRACE)) {
          if (sourceVars.includes(name)) {
            problems.push(`"${key}": "{ ${name} }" should be "{{ ${name} }}"`);
          }
        }

        for (const name of extract(translation, DOUBLE_BRACE)) {
          // "{{$x}}" is not an interpolation i18next recognizes.
          const withoutDollars = name.replace(/^\$+/, "");
          if (withoutDollars !== name && sourceVars.includes(withoutDollars)) {
            problems.push(
              `"${key}": "{{${name}}}" should be "{{ ${withoutDollars} }}"`
            );
            continue;
          }
          // Placeholder names must stay valid identifiers — translated
          // names like "{{ דקות }}" never interpolate.
          if (!IDENTIFIER.test(name)) {
            problems.push(
              `"${key}": "{{ ${name} }}" is not a valid interpolation variable`
            );
            continue;
          }
          // Variable names are case sensitive: "{{username}}" does not
          // resolve when the source passes "{{userName}}".
          const intended = sourceVars.find(
            (candidate) =>
              !sourceVars.includes(name) &&
              candidate.toLowerCase() === name.toLowerCase()
          );
          if (intended !== undefined) {
            problems.push(
              `"${key}": "{{ ${name} }}" should be "{{ ${intended} }}"`
            );
          }
        }
      }

      expect(problems.join("\n")).toEqual("");
    });
  });
});
