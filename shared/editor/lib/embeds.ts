import type { Node, Schema } from "prosemirror-model";
import type { EmbedDescriptor } from "../embeds";
import { isList } from "../queries/isList";

export function getMatchingEmbed(
  embeds: EmbedDescriptor[],
  href: string
): { embed: EmbedDescriptor; matches: RegExpMatchArray } | undefined {
  for (const e of embeds) {
    const matches = e.matcher(href);
    if (matches) {
      return { embed: e, matches };
    }
  }

  return undefined;
}

export function transformListToEmbeds(listNode: Node, schema: Schema): Node[] {
  const nodes: Node[] = [];

  listNode.forEach((node) => {
    nodes.push(...transformListItemToEmbeds(node, schema));
  });

  return nodes;
}

function transformListItemToEmbeds(listItemNode: Node, schema: Schema): Node[] {
  const nodes: Node[] = [];

  listItemNode.forEach((node) => {
    if (node.type.name === "paragraph") {
      const url = node.textContent;
      nodes.push(schema.nodes.embed.create({ href: url }));
    } else if (isList(node, schema)) {
      nodes.push(...transformListToEmbeds(node, schema));
    }
  });

  return nodes;
}
