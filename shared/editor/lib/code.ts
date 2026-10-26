import type { Syntax } from "refractor";
import { FrequencyTracker } from "../../utils/FrequencyTracker";

/**
 * Describes a code language supported by the editor.
 */
type CodeLanguage = {
  /** The language identifier used by Refractor for syntax highlighting. */
  lang: string;
  /** The human-readable label shown in the language selector. */
  label: string;
  /** Lazily loads the Refractor syntax definition for the language. */
  loader?: () => Promise<Syntax>;
  /**
   * Whether this entry is a backwards-compatible alias for another language.
   * Aliases remain resolvable for existing documents but are hidden from the
   * language selector to avoid duplicate options.
   */
  alias?: boolean;
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
  abap: {
    lang: "abap",
    label: "ABAP",
    loader: () => import("refractor/abap").then((m) => m.default),
  },
  bash: {
    lang: "bash",
    label: "Bash",
    loader: () => import("refractor/bash").then((m) => m.default),
  },
  clike: {
    lang: "clike",
    label: "C",
    loader: () => import("refractor/clike").then((m) => m.default),
  },
  cpp: {
    lang: "cpp",
    label: "C++",
    loader: () => import("refractor/cpp").then((m) => m.default),
  },
  csharp: {
    lang: "csharp",
    label: "C#",
    loader: () => import("refractor/csharp").then((m) => m.default),
  },
  css: {
    lang: "css",
    label: "CSS",
    loader: () => import("refractor/css").then((m) => m.default),
  },
  csv: {
    lang: "csv",
    label: "CSV",
    loader: () => import("refractor/csv").then((m) => m.default),
  },
  dart: {
    lang: "dart",
    label: "Dart",
    loader: () => import("refractor/dart").then((m) => m.default),
  },
  diff: {
    lang: "diff",
    label: "Diff",
    loader: () => import("refractor/diff").then((m) => m.default),
  },
  docker: {
    lang: "docker",
    label: "Docker",
    loader: () => import("refractor/docker").then((m) => m.default),
  },
  elixir: {
    lang: "elixir",
    label: "Elixir",
    loader: () => import("refractor/elixir").then((m) => m.default),
  },
  erb: {
    lang: "erb",
    label: "ERB",
    loader: () => import("refractor/erb").then((m) => m.default),
  },
  erlang: {
    lang: "erlang",
    label: "Erlang",
    loader: () => import("refractor/erlang").then((m) => m.default),
  },
  fortran: {
    lang: "fortran",
    label: "Fortran",
    loader: () => import("refractor/fortran").then((m) => m.default),
  },
  go: {
    lang: "go",
    label: "Go",
    loader: () => import("refractor/go").then((m) => m.default),
  },
  graphql: {
    lang: "graphql",
    label: "GraphQL",
    loader: () => import("refractor/graphql").then((m) => m.default),
  },
  groovy: {
    lang: "groovy",
    label: "Groovy",
    loader: () => import("refractor/groovy").then((m) => m.default),
  },
  haskell: {
    lang: "haskell",
    label: "Haskell",
    loader: () => import("refractor/haskell").then((m) => m.default),
  },
  hcl: {
    lang: "hcl",
    label: "HCL",
    loader: () => import("refractor/hcl").then((m) => m.default),
  },
  markup: {
    lang: "markup",
    label: "HTML",
    loader: () => import("refractor/markup").then((m) => m.default),
  },
  ini: {
    lang: "ini",
    label: "INI",
    loader: () => import("refractor/ini").then((m) => m.default),
  },
  java: {
    lang: "java",
    label: "Java",
    loader: () => import("refractor/java").then((m) => m.default),
  },
  javascript: {
    lang: "javascript",
    label: "JavaScript",
    loader: () => import("refractor/javascript").then((m) => m.default),
  },
  json: {
    lang: "json",
    label: "JSON",
    loader: () => import("refractor/json").then((m) => m.default),
  },
  jsx: {
    lang: "jsx",
    label: "JSX",
    loader: () => import("refractor/jsx").then((m) => m.default),
  },
  kotlin: {
    lang: "kotlin",
    label: "Kotlin",
    loader: () => import("refractor/kotlin").then((m) => m.default),
  },
  kusto: {
    lang: "kusto",
    label: "Kusto",
    loader: () => import("refractor/kusto").then((m) => m.default),
  },
  lisp: {
    lang: "lisp",
    label: "Lisp",
    loader: () => import("refractor/lisp").then((m) => m.default),
  },
  lua: {
    lang: "lua",
    label: "Lua",
    loader: () => import("refractor/lua").then((m) => m.default),
  },
  makefile: {
    lang: "makefile",
    label: "Makefile",
    loader: () => import("refractor/makefile").then((m) => m.default),
  },
  markdown: {
    lang: "markdown",
    label: "Markdown",
    loader: () => import("refractor/markdown").then((m) => m.default),
  },
  mermaid: {
    lang: "mermaid",
    label: "Mermaid",
    loader: () => import("refractor/mermaid").then((m) => m.default),
  },
  mermaidjs: {
    lang: "mermaid",
    label: "Mermaid",
    alias: true,
    loader: () => import("refractor/mermaid").then((m) => m.default),
  },
  nginx: {
    lang: "nginx",
    label: "Nginx",
    loader: () => import("refractor/nginx").then((m) => m.default),
  },
  nix: {
    lang: "nix",
    label: "Nix",
    loader: () => import("refractor/nix").then((m) => m.default),
  },
  objectivec: {
    lang: "objectivec",
    label: "Objective-C",
    loader: () => import("refractor/objectivec").then((m) => m.default),
  },
  ocaml: {
    lang: "ocaml",
    label: "OCaml",
    loader: () => import("refractor/ocaml").then((m) => m.default),
  },
  perl: {
    lang: "perl",
    label: "Perl",
    loader: () => import("refractor/perl").then((m) => m.default),
  },
  php: {
    lang: "php",
    label: "PHP",
    loader: () => import("refractor/php").then((m) => m.default),
  },
  powershell: {
    lang: "powershell",
    label: "PowerShell",
    loader: () => import("refractor/powershell").then((m) => m.default),
  },
  promql: {
    lang: "promql",
    label: "PromQL",
    loader: () => import("refractor/promql").then((m) => m.default),
  },
  protobuf: {
    lang: "protobuf",
    label: "Protobuf",
    loader: () => import("refractor/protobuf").then((m) => m.default),
  },
  python: {
    lang: "python",
    label: "Python",
    loader: () => import("refractor/python").then((m) => m.default),
  },
  r: {
    lang: "r",
    label: "R",
    loader: () => import("refractor/r").then((m) => m.default),
  },
  regex: {
    lang: "regex",
    label: "Regex",
    loader: () => import("refractor/regex").then((m) => m.default),
  },
  ruby: {
    lang: "ruby",
    label: "Ruby",
    loader: () => import("refractor/ruby").then((m) => m.default),
  },
  rust: {
    lang: "rust",
    label: "Rust",
    loader: () => import("refractor/rust").then((m) => m.default),
  },
  scala: {
    lang: "scala",
    label: "Scala",
    loader: () => import("refractor/scala").then((m) => m.default),
  },
  sass: {
    lang: "sass",
    label: "Sass",
    loader: () => import("refractor/sass").then((m) => m.default),
  },
  scss: {
    lang: "scss",
    label: "SCSS",
    loader: () => import("refractor/scss").then((m) => m.default),
  },
  "splunk-spl": {
    lang: "splunk-spl",
    label: "Splunk SPL",
    loader: () => import("refractor/splunk-spl").then((m) => m.default),
  },
  sql: {
    lang: "sql",
    label: "SQL",
    loader: () => import("refractor/sql").then((m) => m.default),
  },
  solidity: {
    lang: "solidity",
    label: "Solidity",
    loader: () => import("refractor/solidity").then((m) => m.default),
  },
  swift: {
    lang: "swift",
    label: "Swift",
    loader: () => import("refractor/swift").then((m) => m.default),
  },
  toml: {
    lang: "toml",
    label: "TOML",
    loader: () => import("refractor/toml").then((m) => m.default),
  },
  tsx: {
    lang: "tsx",
    label: "TSX",
    loader: () => import("refractor/tsx").then((m) => m.default),
  },
  typescript: {
    lang: "typescript",
    label: "TypeScript",
    loader: () => import("refractor/typescript").then((m) => m.default),
  },
  vb: {
    lang: "vbnet",
    label: "Visual Basic",
    loader: () => import("refractor/vbnet").then((m) => m.default),
  },
  verilog: {
    lang: "verilog",
    label: "Verilog",
    loader: () => import("refractor/verilog").then((m) => m.default),
  },
  vhdl: {
    lang: "vhdl",
    label: "VHDL",
    loader: () => import("refractor/vhdl").then((m) => m.default),
  },
  yaml: {
    lang: "yaml",
    label: "YAML",
    loader: () => import("refractor/yaml").then((m) => m.default),
  },
  xml: {
    lang: "markup",
    label: "XML",
    loader: () => import("refractor/markup").then((m) => m.default),
  },
  zig: {
    lang: "zig",
    label: "Zig",
    loader: () => import("refractor/zig").then((m) => m.default),
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

// Mermaid diagrams have a separate insertion entry point, so they should never
// be remembered as a recently or frequently used code language.
const nonPersistableLanguages = ["mermaid", "mermaidjs"];

const isPersistableCodeLanguage = (language: string) =>
  !nonPersistableLanguages.includes(language);

const codeLanguageFrequency = new FrequencyTracker<keyof typeof codeLanguages>({
  key: "frequent-code-languages",
  recentKey: "rme-code-language",
  track: 10,
  get: 5,
  filter: isPersistableCodeLanguage,
});

/**
 * Set the most recent code language used.
 *
 * @param language The language identifier.
 */
export const setRecentlyUsedCodeLanguage = (language: string) =>
  codeLanguageFrequency.track(language as keyof typeof codeLanguages);

/**
 * Get the most recent code language used.
 *
 * @returns The most recent code language used, or undefined if none is set.
 */
export const getRecentlyUsedCodeLanguage = () => codeLanguageFrequency.recent;

/**
 * Get the most frequent code languages used.
 *
 * @returns An array of the most frequent code languages used.
 */
export const getFrequentCodeLanguages = () => codeLanguageFrequency.frequent;

export const languagesWithFourSpaceIndent = [
  "python",
  "java",
  "cpp",
  "csharp",
  "rust",
];
