// oxlint exits 1 when every input matches .oxlintrc.json ignorePatterns
// (e.g. migration-only commits). Swallow that specific case so the hook
// passes, while still surfacing real lint failures.
const oxlint = (files) =>
  `bash -c 'out=$(oxlint ${files.join(" ")} --fix --type-aware 2>&1); rc=$?; printf "%s\\n" "$out"; if [ $rc -ne 0 ] && ! printf "%s" "$out" | grep -q "No files found to lint"; then exit $rc; fi'`;

// A translation key containing ":" is parsed as "namespace:key", and because the
// parser writes every namespace to the same file, the stray namespace replaces
// the whole catalog with an empty object. Fail the commit instead of silently
// committing an empty catalog.
const checkTranslations = () =>
  `node -e "if (!Object.keys(require('./shared/i18n/locales/en_US/translation.json')).length) { console.error('en_US translation.json is empty. Check for a translation key containing a colon (:), which is treated as a namespace separator.'); process.exit(1); }"`;

export default {
  // Run oxfmt first for formatting, then oxlint for linting, and translation updates on changes to JS and
  // TypeScript files
  "**/*.[tj]s?(x)": [
    (f) => `oxfmt ${f.join(" ")}`,
    (f) => (f.length > 20 ? `yarn lint --fix` : oxlint(f)),
    () => `yarn build:i18n`,
    checkTranslations,
    () => "git add shared/i18n/locales/en_US/translation.json",
  ],

  // Automatically de-duplicate packages as yarn is terrible at it
  "(yarn.lock|package.json)": () => `yarn dedupe`,
};
