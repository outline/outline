module.exports = {
  contextSeparator: "_",
  // Key separator used in your translation keys

  createOldCatalogs: false,
  // Save the \_old files

  defaultNamespace: "translation",
  // Default namespace used in your i18next config

  defaultValue(locale, namespace, key) {
    return key;
  },
  // Default value to give to empty keys

  indentation: 2,
  // Indentation of the catalog files

  keepRemoved: false,
  // Keep keys from the catalog that are no longer in code

  keySeparator: false,
  // Key separator used in your translation keys
  // If you want to use plain english keys, separators such as `.` and `:` will conflict. You might want to set `keySeparator: false` and `namespaceSeparator: false`. That way, `t('Status: Loading...')` will not think that there are a namespace and three separator dots for instance.

  // see below for more details
  lexers: {
    hbs: ["HandlebarsLexer"],
    handlebars: ["HandlebarsLexer"],

    htm: ["HTMLLexer"],
    html: ["HTMLLexer"],

    mjs: ["JavascriptLexer"],
    js: ["JsxLexer"], // if you're writing jsx inside .js files, change this to JsxLexer
    ts: ["JavascriptLexer"],
    jsx: ["JsxLexer"],
    tsx: ["JsxLexer"],

    default: ["JavascriptLexer"],
  },

  lineEnding: "auto",
  // Control the line ending. See options at https://github.com/ryanve/eol

  namespaceSeparator: ":",
  // Namespace separator used in your translation keys
  // If you want to use plain english keys, separators such as `.` and `:` will conflict. You might want to set `keySeparator: false` and `namespaceSeparator: false`. That way, `t('Status: Loading...')` will not think that there are a namespace and three separator dots for instance.

  output: "shared/i18n/locales/en_US/translation.json",
  // Supports $LOCALE and $NAMESPACE injection
  // Supports JSON (.json) and YAML (.yml) file formats
  // Where to write the locale files relative to process.cwd()

  input: undefined,
  // An array of globs that describe where to look for source files
  // relative to the location of the configuration file

  sort: false,
  // Whether or not to sort the catalog

  skipDefaultValues: false,
  // Whether to ignore default values.

  verbose: false,
  // Display info about the parsing including some stats

  failOnWarnings: false,
  // Exit with an exit code of 1 on warnings

  customValueTemplate: null,

  i18nextOptions: {
    compatibilityJSON: "v3",
  },
};
