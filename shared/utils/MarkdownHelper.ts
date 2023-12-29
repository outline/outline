interface DocumentInterface {
  emoji?: string | null;
  title: string;
  text: string;
}

export default class MarkdownHelper {
  /**
   * Returns the document as cleaned Markdown for export.
   *
   * @param document The document or revision to convert
   * @returns The document title and content as a Markdown string
   */
  static toMarkdown(document: DocumentInterface) {
    const text = document.text
      .replace(/\n\\\n/g, "\n\n")
      .replace(/“/g, '"')
      .replace(/”/g, '"')
      .replace(/‘/g, "'")
      .replace(/’/g, "'")
      .trim();

    const title = `${document.emoji ? document.emoji + " " : ""}${
      document.title
    }`;

    return `# ${title}\n\n${text}`;
  }
}
