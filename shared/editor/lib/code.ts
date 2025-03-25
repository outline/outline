import Storage from "../../utils/Storage";

const RecentStorageKey = "rme-code-language";
const StorageKey = "frequent-code-languages";
const frequentLanguagesToGet = 5;
const frequentLanguagesToTrack = 10;

/**
 * List of supported code languages.
 *
 * Object key is the language identifier used in the editor, lang is the
 * language identifier used by Prism. Note mismatches such as `markup` and
 * `mermaid`.
 */
export const codeLanguages = {
  none: { lang: "", label: "Plain text" },
  bash: { lang: "bash", label: "Bash" },
  clike: { lang: "clike", label: "C" },
  cpp: { lang: "cpp", label: "C++" },
  csharp: { lang: "csharp", label: "C#" },
  css: { lang: "css", label: "CSS" },
  docker: { lang: "docker", label: "Docker" },
  elixir: { lang: "elixir", label: "Elixir" },
  erlang: { lang: "erlang", label: "Erlang" },
  go: { lang: "go", label: "Go" },
  graphql: { lang: "graphql", label: "GraphQL" },
  groovy: { lang: "groovy", label: "Groovy" },
  haskell: { lang: "haskell", label: "Haskell" },
  hcl: { lang: "hcl", label: "HCL" },
  markup: { lang: "markup", label: "HTML" },
  ini: { lang: "ini", label: "INI" },
  java: { lang: "java", label: "Java" },
  javascript: { lang: "javascript", label: "JavaScript" },
  json: { lang: "json", label: "JSON" },
  jsx: { lang: "jsx", label: "JSX" },
  kotlin: { lang: "kotlin", label: "Kotlin" },
  lisp: { lang: "lisp", label: "Lisp" },
  lua: { lang: "lua", label: "Lua" },
  mermaidjs: { lang: "mermaid", label: "Mermaid Diagram" },
  nginx: { lang: "nginx", label: "Nginx" },
  nix: { lang: "nix", label: "Nix" },
  objectivec: { lang: "objectivec", label: "Objective-C" },
  ocaml: { lang: "ocaml", label: "OCaml" },
  perl: { lang: "perl", label: "Perl" },
  php: { lang: "php", label: "PHP" },
  powershell: { lang: "powershell", label: "Powershell" },
  protobuf: { lang: "protobuf", label: "Protobuf" },
  python: { lang: "python", label: "Python" },
  r: { lang: "r", label: "R" },
  ruby: { lang: "ruby", label: "Ruby" },
  rust: { lang: "rust", label: "Rust" },
  scala: { lang: "scala", label: "Scala" },
  sass: { lang: "sass", label: "Sass" },
  scss: { lang: "scss", label: "SCSS" },
  sql: { lang: "sql", label: "SQL" },
  solidity: { lang: "solidity", label: "Solidity" },
  swift: { lang: "swift", label: "Swift" },
  toml: { lang: "toml", label: "TOML" },
  tsx: { lang: "tsx", label: "TSX" },
  typescript: { lang: "typescript", label: "TypeScript" },
  vb: { lang: "vb", label: "Visual Basic" },
  verilog: { lang: "verilog", label: "Verilog" },
  vhdl: { lang: "vhdl", label: "VHDL" },
  yaml: { lang: "yaml", label: "YAML" },
  xml: { lang: "markup", label: "XML" },
  zig: { lang: "zig", label: "Zig" },
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
 * Get the Prism language identifier for a given language.
 *
 * @param language The language identifier.
 * @returns The Prism language identifier for the language.
 */
export const getPrismLangForLanguage = (language: string): string | undefined =>
  codeLanguages[language as keyof typeof codeLanguages]?.lang;

/**
 * Set the most recent code language used.
 *
 * @param language The language identifier.
 */
export const setRecentCodeLanguage = (language: string) => {
  const frequentLangs = (Storage.get(StorageKey) ?? {}) as Record<
    string,
    number
  >;

  if (Object.keys(frequentLangs).length === 0) {
    const lastUsedLang = Storage.get(RecentStorageKey);
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
  Storage.set(RecentStorageKey, language);
};

/**
 * Get the most recent code language used.
 *
 * @returns The most recent code language used, or undefined if none is set.
 */
export const getRecentCodeLanguage = () =>
  Storage.get(RecentStorageKey) as keyof typeof codeLanguages | undefined;

/**
 * Get the most frequent code languages used.
 *
 * @returns An array of the most frequent code languages used.
 */
export const getFrequentCodeLanguages = () => {
  const recentLang = Storage.get(RecentStorageKey);
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
