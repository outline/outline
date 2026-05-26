// Mirrors ignorePatterns in .oxlintrc.json. When every staged file matches one
// of these, oxlint exits with "No files found to lint" and fails the hook.
const isOxlintIgnored = (file) =>
  file.includes("/server/migrations/") ||
  file.includes("/server/scripts/") ||
  file.includes("/build/") ||
  file.includes("/public/") ||
  file.includes("/patches/") ||
  file.endsWith(".d.ts");

export default {
  // Run prettier first for formatting, then oxlint for linting, and translation updates on changes to JS and
  // TypeScript files
  "**/*.[tj]s?(x)": [
    (f) => `prettier --write ${f.join(" ")}`,
    (f) => {
      const lintable = f.filter((file) => !isOxlintIgnored(file));
      if (lintable.length === 0) {
        return [];
      }
      return lintable.length > 20
        ? `yarn lint --fix`
        : `oxlint ${lintable.join(" ")} --fix --type-aware`;
    },
    () => `yarn build:i18n`,
    () => "git add shared/i18n/locales/en_US/translation.json",
  ],

  // Automatically de-duplicate packages as yarn is terrible at it
  "(yarn.lock|package.json)": () => `yarn dedupe`,
};
