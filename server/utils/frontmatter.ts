import yaml from "js-yaml";

// Frontmatter must start at the beginning of the document
const frontmatterRegex = /^---\n([\s\S]*?)\n---(?:\n|$)/;

/**
 * Parses YAML frontmatter from the start of a markdown document.
 *
 * @param content the markdown content that may contain frontmatter.
 * @returns the parsed frontmatter data and the content with the frontmatter
 *   block removed, or undefined data when no valid frontmatter is present.
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown> | undefined;
  content: string;
} {
  const match = content.match(frontmatterRegex);
  if (!match) {
    return { data: undefined, content };
  }

  let data: unknown;
  try {
    data = yaml.load(match[1]);
  } catch {
    return { data: undefined, content };
  }

  if (!isPlainObject(data)) {
    return { data: undefined, content };
  }

  return {
    data,
    content: content.slice(match[0].length),
  };
}

/**
 * Serializes data to a YAML frontmatter block.
 *
 * @param data the data to serialize.
 * @returns the frontmatter block including delimiters and a trailing newline,
 *   or an empty string when there is no data to serialize.
 */
export function serializeFrontmatter(data: Record<string, unknown>): string {
  if (Object.keys(data).length === 0) {
    return "";
  }
  return `---\n${yaml.dump(data).trimEnd()}\n---\n\n`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
