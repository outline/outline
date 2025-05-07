import type { RefractorSyntax } from "refractor";
import Storage from "../../utils/Storage";

const RecentlyUsedStorageKey = "rme-code-language";
const StorageKey = "frequent-code-languages";
const frequentLanguagesToGet = 5;
const frequentLanguagesToTrack = 10;

type CodeLanguage = {
  lang: string;
  label: string;
  loader?: () => Promise<RefractorSyntax>;
};

/**
 * List of supported code languages.
 *
 * Object key is the language identifier used in the editor, lang is the
 * language identifier used by Refractor. Note mismatches such as `markup` and
 * `mermaid`.
 */
export const codeLanguages: Record<string, CodeLanguage> = {
  none: { lang: "", label: "Plain text" },
  bash: {
    lang: "bash",
    label: "Bash",
    loader: () => import("refractor/lang/bash").then((m) => m.default),
  },
  clike: {
    lang: "clike",
    label: "C",
    loader: () => import("refractor/lang/clike").then((m) => m.default),
  },
  cpp: {
    lang: "cpp",
    label: "C++",
    loader: () => import("refractor/lang/cpp").then((m) => m.default),
  },
  csharp: {
    lang: "csharp",
    label: "C#",
    loader: () => import("refractor/lang/csharp").then((m) => m.default),
  },
  css: {
    lang: "css",
    label: "CSS",
    loader: () => import("refractor/lang/css").then((m) => m.default),
  },
  csv: {
    lang: "csv",
    label: "CSV",
    loader: () => import("refractor/lang/csv").then((m) => m.default),
  },
  docker: {
    lang: "docker",
    label: "Docker",
    loader: () => import("refractor/lang/docker").then((m) => m.default),
  },
  elixir: {
    lang: "elixir",
    label: "Elixir",
    loader: () => import("refractor/lang/elixir").then((m) => m.default),
  },
  erb: {
    lang: "erb",
    label: "ERB",
    loader: () => import("refractor/lang/erb").then((m) => m.default),
  },
  erlang: {
    lang: "erlang",
    label: "Erlang",
    loader: () => import("refractor/lang/erlang").then((m) => m.default),
  },
  go: {
    lang: "go",
    label: "Go",
    loader: () => import("refractor/lang/go").then((m) => m.default),
  },
  graphql: {
    lang: "graphql",
    label: "GraphQL",
    loader: () => import("refractor/lang/graphql").then((m) => m.default),
  },
  groovy: {
    lang: "groovy",
    label: "Groovy",
    loader: () => import("refractor/lang/groovy").then((m) => m.default),
  },
  haskell: {
    lang: "haskell",
    label: "Haskell",
    loader: () => import("refractor/lang/haskell").then((m) => m.default),
  },
  hcl: {
    lang: "hcl",
    label: "HCL",
    loader: () => import("refractor/lang/hcl").then((m) => m.default),
  },
  markup: {
    lang: "markup",
    label: "HTML",
    loader: () => import("refractor/lang/markup").then((m) => m.default),
  },
  ini: {
    lang: "ini",
    label: "INI",
    loader: () => import("refractor/lang/ini").then((m) => m.default),
  },
  java: {
    lang: "java",
    label: "Java",
    loader: () => import("refractor/lang/java").then((m) => m.default),
  },
  javascript: {
    lang: "javascript",
    label: "JavaScript",
    loader: () => import("refractor/lang/javascript").then((m) => m.default),
  },
  json: {
    lang: "json",
    label: "JSON",
    loader: () => import("refractor/lang/json").then((m) => m.default),
  },
  jsx: {
    lang: "jsx",
    label: "JSX",
    loader: () => import("refractor/lang/jsx").then((m) => m.default),
  },
  kotlin: {
    lang: "kotlin",
    label: "Kotlin",
    loader: () => import("refractor/lang/kotlin").then((m) => m.default),
  },
  kusto: {
    lang: "kusto",
    label: "Kusto",
    // @ts-expect-error Mermaid is not in types but exists
    loader: () => import("refractor/lang/kusto").then((m) => m.default),
  },
  lisp: {
    lang: "lisp",
    label: "Lisp",
    loader: () => import("refractor/lang/lisp").then((m) => m.default),
  },
  lua: {
    lang: "lua",
    label: "Lua",
    loader: () => import("refractor/lang/lua").then((m) => m.default),
  },
  makefile: {
    lang: "makefile",
    label: "Makefile",
    loader: () => import("refractor/lang/makefile").then((m) => m.default),
  },
  markdown: {
    lang: "markdown",
    label: "Markdown",
    loader: () => import("refractor/lang/markdown").then((m) => m.default),
  },
  mermaidjs: {
    lang: "mermaid",
    label: "Mermaid Diagram",
    // @ts-expect-error Mermaid is not in types but exists
    loader: () => import("refractor/lang/mermaid").then((m) => m.default),
  },
  nginx: {
    lang: "nginx",
    label: "Nginx",
    loader: () => import("refractor/lang/nginx").then((m) => m.default),
  },
  nix: {
    lang: "nix",
    label: "Nix",
    loader: () => import("refractor/lang/nix").then((m) => m.default),
  },
  objectivec: {
    lang: "objectivec",
    label: "Objective-C",
    loader: () => import("refractor/lang/objectivec").then((m) => m.default),
  },
  ocaml: {
    lang: "ocaml",
    label: "OCaml",
    loader: () => import("refractor/lang/ocaml").then((m) => m.default),
  },
  perl: {
    lang: "perl",
    label: "Perl",
    loader: () => import("refractor/lang/perl").then((m) => m.default),
  },
  php: {
    lang: "php",
    label: "PHP",
    loader: () => import("refractor/lang/php").then((m) => m.default),
  },
  powershell: {
    lang: "powershell",
    label: "Powershell",
    loader: () => import("refractor/lang/powershell").then((m) => m.default),
  },
  promql: {
    lang: "promql",
    label: "PromQL",
    // @ts-expect-error PromQL is not in types but exists
    loader: () => import("refractor/lang/promql").then((m) => m.default),
  },
  protobuf: {
    lang: "protobuf",
    label: "Protobuf",
    loader: () => import("refractor/lang/protobuf").then((m) => m.default),
  },
  python: {
    lang: "python",
    label: "Python",
    loader: () => import("refractor/lang/python").then((m) => m.default),
  },
  r: {
    lang: "r",
    label: "R",
    loader: () => import("refractor/lang/r").then((m) => m.default),
  },
  regex: {
    lang: "regex",
    label: "Regex",
    loader: () => import("refractor/lang/regex").then((m) => m.default),
  },
  ruby: {
    lang: "ruby",
    label: "Ruby",
    loader: () => import("refractor/lang/ruby").then((m) => m.default),
  },
  rust: {
    lang: "rust",
    label: "Rust",
    loader: () => import("refractor/lang/rust").then((m) => m.default),
  },
  scala: {
    lang: "scala",
    label: "Scala",
    loader: () => import("refractor/lang/scala").then((m) => m.default),
  },
  sass: {
    lang: "sass",
    label: "Sass",
    loader: () => import("refractor/lang/sass").then((m) => m.default),
  },
  scss: {
    lang: "scss",
    label: "SCSS",
    loader: () => import("refractor/lang/scss").then((m) => m.default),
  },
  "splunk-spl": {
    lang: "splunk-spl",
    label: "Splunk SPL",
    loader: () => import("refractor/lang/splunk-spl").then((m) => m.default),
  },
  sql: {
    lang: "sql",
    label: "SQL",
    loader: () => import("refractor/lang/sql").then((m) => m.default),
  },
  solidity: {
    lang: "solidity",
    label: "Solidity",
    loader: () => import("refractor/lang/solidity").then((m) => m.default),
  },
  swift: {
    lang: "swift",
    label: "Swift",
    loader: () => import("refractor/lang/swift").then((m) => m.default),
  },
  toml: {
    lang: "toml",
    label: "TOML",
    loader: () => import("refractor/lang/toml").then((m) => m.default),
  },
  tsx: {
    lang: "tsx",
    label: "TSX",
    loader: () => import("refractor/lang/tsx").then((m) => m.default),
  },
  typescript: {
    lang: "typescript",
    label: "TypeScript",
    loader: () => import("refractor/lang/typescript").then((m) => m.default),
  },
  vb: {
    lang: "vbnet",
    label: "Visual Basic",
    loader: () => import("refractor/lang/vbnet").then((m) => m.default),
  },
  verilog: {
    lang: "verilog",
    label: "Verilog",
    loader: () => import("refractor/lang/verilog").then((m) => m.default),
  },
  vhdl: {
    lang: "vhdl",
    label: "VHDL",
    loader: () => import("refractor/lang/vhdl").then((m) => m.default),
  },
  yaml: {
    lang: "yaml",
    label: "YAML",
    loader: () => import("refractor/lang/yaml").then((m) => m.default),
  },
  xml: {
    lang: "markup",
    label: "XML",
    loader: () => import("refractor/lang/markup").then((m) => m.default),
  },
  zig: {
    lang: "zig",
    label: "Zig",
    loader: () => import("refractor/lang/zig").then((m) => m.default),
  },
};

/**
 * Get the human-readable label for a given language.
 *
 * @param language The language identifier.
 * @returns The human-readable label for the language.
 */
export const getLabelForLanguage = (language: string) => {
  const lang =
    codeLanguages[language as keyof typeof codeLanguages] ?? codeLanguages.none;
  return lang.label;
};

/**
 * Get the Refractor language identifier for a given language.
 *
 * @param language The language identifier.
 * @returns The Refractor language identifier for the language.
 */
export const getRefractorLangForLanguage = (
  language: string
): string | undefined =>
  codeLanguages[language as keyof typeof codeLanguages]?.lang;

/**
 * Get the loader function for a given language.
 *
 * @param language The language identifier.
 * @returns The loader function for the language, or undefined if not available.
 */
export const getLoaderForLanguage = (language: string) =>
  codeLanguages[language as keyof typeof codeLanguages]?.loader;

/**
 * Set the most recent code language used.
 *
 * @param language The language identifier.
 */
export const setRecentlyUsedCodeLanguage = (language: string) => {
  const frequentLangs = (Storage.get(StorageKey) ?? {}) as Record<
    string,
    number
  >;

  if (Object.keys(frequentLangs).length === 0) {
    const lastUsedLang = Storage.get(RecentlyUsedStorageKey);
    if (lastUsedLang) {
      frequentLangs[lastUsedLang] = 1;
    }
  }

  frequentLangs[language] = (frequentLangs[language] ?? 0) + 1;

  const frequentLangEntries = Object.entries(frequentLangs);

  if (frequentLangEntries.length > frequentLanguagesToTrack) {
    sortFrequencies(frequentLangEntries);

    const lastEntry = frequentLangEntries[frequentLanguagesToTrack];
    if (lastEntry[0] === language) {
      frequentLangEntries.splice(frequentLanguagesToTrack - 1, 1);
    } else {
      frequentLangEntries.splice(frequentLanguagesToTrack);
    }
  }

  Storage.set(StorageKey, Object.fromEntries(frequentLangEntries));
  Storage.set(RecentlyUsedStorageKey, language);
};

/**
 * Get the most recent code language used.
 *
 * @returns The most recent code language used, or undefined if none is set.
 */
export const getRecentlyUsedCodeLanguage = () =>
  Storage.get(RecentlyUsedStorageKey) as keyof typeof codeLanguages | undefined;

/**
 * Get the most frequent code languages used.
 *
 * @returns An array of the most frequent code languages used.
 */
export const getFrequentCodeLanguages = () => {
  const recentLang = Storage.get(RecentlyUsedStorageKey);
  const frequentLangEntries = Object.entries(Storage.get(StorageKey) ?? {}) as [
    keyof typeof codeLanguages,
    number
  ][];

  const frequentLangs = sortFrequencies(frequentLangEntries)
    .slice(0, frequentLanguagesToGet)
    .map(([lang]) => lang);

  const isRecentLangPresent = frequentLangs.includes(recentLang);
  if (recentLang && !isRecentLangPresent) {
    frequentLangs.pop();
    frequentLangs.push(recentLang);
  }

  return frequentLangs;
};

const sortFrequencies = <T>(freqs: [T, number][]) =>
  freqs.sort((a, b) => (a[1] >= b[1] ? -1 : 1));
