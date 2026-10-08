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
   * Parse and convert frontmatter to a YAML codeblock.
   *
   * @param content The markdown content that may contain frontmatter.
   * @returns The markdown content with frontmatter converted to a YAML codeblock.
   */
  protected static processFrontmatter(content: string): string {
    // Frontmatter must start at the beginning of the document
    const frontmatterRegex = /^---\n([\s\S]*?)\n---(?:\n|$)/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return content;
    }

    const frontmatterContent = match[1];
    const remainingContent = content.slice(match[0].length);

    // Validate that the frontmatter is valid YAML
    try {
      yaml.load(frontmatterContent);
    } catch {
      // If it's not valid YAML, return content unchanged
      return content;
    }

    // Convert frontmatter to a YAML codeblock
    const codeBlockDelimiter = "```";
    const yamlCodeblock = `${codeBlockDelimiter}yaml\n${frontmatterContent}\n${codeBlockDelimiter}\n\n`;

    return yamlCodeblock + remainingContent;
  }
}
