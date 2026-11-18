import fs from "node:fs";
import path from "node:path";

const catalog: Record<string, string> = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "locales/en_US/translation.json"),
    "utf8"
  )
);

const rules: Record<string, RegExp> = {
  "British spelling":
    /\b(behaviour|cancell(ed|ing)|catalogue|centre|colour|customis|defence|favourit|grey|honour|initialis|judgement|labell|learnt|licence|modell|optimis|organis|prioritis|recognis|summaris|synchronis|travell|whilst)/i,
  "British phrasing": /\b(you|we)’ve not\b/i,
  "comma splice": /, (try again|however|otherwise)\b/i,
  "article before a variable": /\ba \{\{/,
};

describe("en_US translations", () => {
  it.each(Object.entries(rules))("has no %s", (_name, pattern) => {
    const failures = Object.entries(catalog)
      .filter(([, value]) => pattern.test(value))
      .map(([key]) => key);

    expect(failures).toEqual([]);
  });

  it("has no plural noun in a singular value", () => {
    const failures = Object.entries(catalog)
      .filter(
        ([key, value]) =>
          `${key}_plural` in catalog && /\{\{ ?count ?\}\} \w+s\b/.test(value)
      )
      .map(([key]) => key);

    expect(failures).toEqual([]);
  });
});
