import { Fragment, type Node } from "prosemirror-model";

/** Node names after which a trailing paragraph is not required. */
export const trailingNodeNotAfter = ["paragraph", "heading"];

/**
 * Determines whether the editor would insert a trailing paragraph after the
 * document's last node. Mirrors the behavior of the TrailingNode extension so
 * that stored content can be normalized to match the editor, avoiding a
 * spurious edit the first time a document is opened.
 *
 * @param doc The document node to inspect.
 * @param notAfter Node names after which a trailing node is not required.
 * @returns whether a trailing paragraph is required.
 */
export function requiresTrailingNode(
  doc: Node,
  notAfter: string[] = trailingNodeNotAfter
): boolean {
  const lastNode = doc.lastChild;
  if (!lastNode) {
    return false;
  }
  // A paragraph holding only non-text content (eg. images) still needs a
  // trailing node so the cursor can be placed after it.
  if (
    lastNode.type.name === "paragraph" &&
    lastNode.content.size > 0 &&
    lastNode.textContent.length === 0
  ) {
    return true;
  }
  return !notAfter.includes(lastNode.type.name);
}

/**
 * Appends a trailing paragraph to the document if the editor would add one on
 * load, returning the normalized document unchanged otherwise.
 *
 * @param doc The document node to normalize.
 * @param notAfter Node names after which a trailing node is not required.
 * @returns the document, with a trailing paragraph appended when required.
 */
export function withTrailingNode(
  doc: Node,
  notAfter: string[] = trailingNodeNotAfter
): Node {
  const paragraph = doc.type.schema.nodes.paragraph;
  if (!paragraph || !requiresTrailingNode(doc, notAfter)) {
    return doc;
  }
  return doc.copy(doc.content.append(Fragment.from(paragraph.create())));
}
