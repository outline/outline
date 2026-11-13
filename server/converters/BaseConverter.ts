import yaml from "js-yaml";

/**
 * Base class for the individual file format converters, holding the handling
 * that is common to reading any incoming file.
 */
export abstract class BaseConverter {
  /**
   * Convert a Buffer to a string.
   *
   * @param content The content as a Buffer or string.
   * @returns The content as a string.
   */
  protected static bufferToString(content: Buffer | string): string {
    return typeof content === "string" ? content : content.toString("utf8");
  }

  /**
   * Parse YAML frontmatter at the start of the content, if present.
   *
   * @param content The markdown content that may contain frontmatter.
   * @returns The parsed frontmatter as an object, or undefined when no valid
   *   frontmatter is present.
   */
  protected static parseFrontmatter(
    content: string
  ): Record<string, unknown> | undefined {
    const match = content.match(this.frontmatterRegex);
    if (!match) {
      return undefined;
    }

    try {
      const data: unknown = yaml.load(match[1]);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as Record<string, unknown>;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Remove YAML frontmatter from the start of the content, if present.
   * Content that is not valid YAML is not frontmatter and is left in place.
   *
   * @param content The markdown content that may contain frontmatter.
   * @returns The markdown content without frontmatter.
   */
  protected static stripFrontmatter(content: string): string {
    const match = content.match(this.frontmatterRegex);
    if (!match) {
      return content;
    }

    try {
      yaml.load(match[1]);
    } catch {
      return content;
    }

    return content.slice(match[0].length);
  }

  // Frontmatter must start at the beginning of the document
  private static readonly frontmatterRegex = /^---\n([\s\S]*?)\n---(?:\n|$)/;
}
