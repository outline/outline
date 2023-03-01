import { Node } from "prosemirror-model";
import { Document, Revision } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";

/**
 * Parse a list of mentions contained in a document or revision
 *
 * @param document Document or Revision
 * @returns An array of mentions in passed document or revision
 */
export default function parseMentions(
  document: Document | Revision
): Record<string, string>[] {
  const node = DocumentHelper.toProsemirror(document);
  const mentions: Record<string, string>[] = [];

  function findMentions(node: Node) {
    if (
      node.type.name === "mention" &&
      !mentions.some((m) => m.id === node.attrs.id)
    ) {
      mentions.push(node.attrs);
    }

    if (!node.content.size) {
      return;
    }

    node.content.descendants(findMentions);
  }

  findMentions(node);

  return mentions;
}
