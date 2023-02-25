import { uniq } from "lodash";
import { Node } from "prosemirror-model";
import { parser } from "@server/editor";

/**
 * Parse a list of mentions contained in markdown text.
 *
 * @param text The text to parse in Markdown format
 * @returns An array of mention identifiers
 */
export default function parseMentions(text: string): string[] {
  const value = parser.parse(text);
  const identifiers: string[] = [];

  function findMentions(node: Node) {
    if (node.type.name === "mention") {
      identifiers.push(node.attrs["data-id"]);
    }

    if (!node.content.size) {
      return;
    }

    node.content.descendants(findMentions);
  }

  findMentions(value);

  return uniq(identifiers);
}
