export default {
  // Run prettier first for formatting, then oxlint for linting, and translation updates on changes to JS and
  // TypeScript files
  "**/*.[tj]s?(x)": [
    (f) => `prettier --write ${f.join(" ")}`,
    (f) =>
      f.length > 20
        ? `yarn lint --fix`
        : `oxlint ${f.join(" ")} --fix --type-aware`,
    () => `yarn build:i18n`,
    () => "git add shared/i18n/locales/en_US/translation.json",
  ],

  // Automatically de-duplicate packages as yarn is terrible at it
  "(yarn.lock|package.json)": () => `yarn yarn-deduplicate yarn.lock`,
};
