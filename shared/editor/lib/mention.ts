import type { Node, Schema } from "prosemirror-model";
import type { Primitive } from "utility-types";
import { v4 as uuidv4 } from "uuid";
import { isList } from "../queries/isList";

/** Separates a document title from the heading that a mention's anchor points at. */
export const ANCHOR_SEPARATOR = "\u203a";

/**
 * Builds the attributes of a mention that links to a document, decided once when
 * the mention is created and read verbatim wherever it is rendered.
 *
 * A reference to a heading in the document being written drops the document
 * title it would otherwise repeat, and an anchor that resolved to no heading is
 * dropped with it, which together make an anchored label without a separator a
 * section of the document that holds it.
 *
 * @param options the document title, the heading the pasted anchor resolved to,
 * that anchor, and whether the mention is being written in that same document.
 * @returns the label and anchor to store on the mention.
 */
export function documentMentionAttrs({
  title,
  heading,
  anchorId,
  sameDocument,
}: {
  title: string;
  heading?: string;
  anchorId?: string;
  sameDocument?: boolean;
}): { label: string; anchorId?: string } {
  if (!heading) {
    return { label: title, anchorId: undefined };
  }

  return {
    label: sameDocument ? heading : `${title} ${ANCHOR_SEPARATOR} ${heading}`,
    anchorId,
  };
}

/**
 * Whether a document mention refers to a heading in the document that holds it,
 * in which case its label is that heading alone.
 *
 * @param attrs the mention's anchor id and label.
 * @returns true if the mention reads as a section rather than a document.
 */
export function isSectionMention(attrs: {
  anchorId?: string;
  label: string;
}): boolean {
  return !!attrs.anchorId && !attrs.label.includes(ANCHOR_SEPARATOR);
}

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
