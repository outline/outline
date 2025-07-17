import { Node, Schema } from "prosemirror-model";
import { Primitive } from "utility-types";
import { v4 } from "uuid";
import { isList } from "../queries/isList";

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
              id: v4(),
              type: mentionType,
              label: link,
              href: link,
              modelId: v4(),
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
