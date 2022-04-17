export default {
  // Run tsc on changes to TypeScript files
  "**/*.ts?(x)": () => "tsc",

  // Efficiently run prettier and translation updates on changes to JS and
  // TypeScript files
  "**/*.[tj]s?(x)": [
    (f) => (f.length > 20 ? `yarn lint --fix` : `eslint ${f.join(" ")} --fix`),
    (f) => `i18next --silent ${f.map((n) => `"${n}"`).join(" ")}`,
    () => "yarn copy:i18n",
  ],

  // Automatically de-duplicate packages as yarn is terrible at it
  "(yarn.lock|package.json)": () => `yarn yarn-deduplicate yarn.lock`,
};
