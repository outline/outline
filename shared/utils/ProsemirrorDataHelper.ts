import type { ProsemirrorData } from "../types";

/**
 * Helpers that operate on plain `ProsemirrorData` JSON.
 */
export class ProsemirrorDataHelper {
  /**
   * Get a new empty document.
   *
   * @returns a new empty document as JSON.
   */
  static getEmpty(): ProsemirrorData {
    return {
      type: "doc",
      content: [
        {
          content: [],
          type: "paragraph",
        },
      ],
    };
  }

  /**
   * Returns true if the data looks like an empty document.
   *
   * @param data The ProsemirrorData to check.
   * @returns True if the document is empty.
   */
  static isEmpty(data: ProsemirrorData): boolean {
    if (data.type !== "doc") {
      return false;
    }

    if (data.content?.length === 1) {
      const node = data.content[0];
      return (
        node.type === "paragraph" &&
        (node.content === null ||
          node.content === undefined ||
          node.content.length === 0)
      );
    }

    return !data.content || data.content.length === 0;
  }

  /**
   * Returns the first line of text in the document, useful for a short plain
   * text preview. Text blocks and hard breaks start a new line.
   *
   * @param data the ProsemirrorData to read.
   * @returns the trimmed first line with text, or undefined.
   */
  static getFirstText(data: ProsemirrorData): string | undefined {
    const lines: string[] = [];
    ProsemirrorDataHelper.collectLines(data, lines);
    return lines.map((line) => line.trim()).find(Boolean);
  }

  private static collectLines(node: ProsemirrorData, lines: string[]) {
    if (node.type === "text") {
      lines[lines.length - 1] += node.text ?? "";
      return;
    }

    // A hard break or any node with content, such as a paragraph, starts a
    // new line.
    lines.push("");
    for (const child of node.content ?? []) {
      ProsemirrorDataHelper.collectLines(child, lines);
    }
    if (node.content?.length) {
      lines.push("");
    }
  }
}
