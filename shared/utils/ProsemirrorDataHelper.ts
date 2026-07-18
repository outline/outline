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
}
