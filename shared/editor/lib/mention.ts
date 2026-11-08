import type { Node, Schema } from "prosemirror-model";
import type { Primitive } from "utility-types";
import { v4 as uuidv4 } from "uuid";
import { MentionType } from "../../types";
import { isList } from "../queries/isList";

/**
 * Whether a mention can be displayed as a preview card.
 *
 * @param node the node to check.
 * @returns true if the node is a mention that supports the card display.
 */
export function canDisplayAsCard(node: Node): boolean {
  return (
    node.type.name === "mention" && cardMentionTypes.includes(node.attrs.type)
  );
}

const cardMentionTypes: string[] = [
  MentionType.URL,
  MentionType.Document,
  MentionType.Collection,
];

export function transformListToMentions(
  listNode: Node,
  schema: Schema,
  attrs: Record<string, Primitive>
): Node {
  const childNodes: Node[] = [];

  listNode.forEach((node) => {
    childNodes.push(transformListItemToMentions(node, schema, attrs));
  });

  return listNode.type.create(listNode.attrs, childNodes);
}

function transformListItemToMentions(
  listItemNode: Node,
  schema: Schema,
  attrs: Record<string, Primitive>
) {
  const childNodes: Node[] = [];

  listItemNode.forEach((node) => {
    if (node.type.name === "paragraph") {
      const link = node.textContent;
      const mentionType = attrs[link];

      if (mentionType) {
        childNodes.push(
          node.type.create(
            node.attrs,
            schema.nodes.mention.create({
              id: uuidv4(),
              type: mentionType,
              label: link,
              href: link,
              modelId: uuidv4(),
              actorId: attrs.actorId,
            })
          )
        );
      } else {
        childNodes.push(node);
      }
    } else if (isList(node, schema)) {
      const subListNode = transformListToMentions(node, schema, attrs);
      childNodes.push(subListNode);
    }
  });

  return listItemNode.type.create(listItemNode.attrs, childNodes);
}
