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

/**
 * Find the embed that should claim a URL the user did not explicitly ask to
 * embed — one pasted into the editor, or parsed out of markdown.
 *
 * Descriptors with `matchOnInput` disabled are skipped. The generic iframe
 * embed is one of them and matches every http(s) URL, so including it would
 * make any URL look like a match.
 *
 * @param embeds the descriptors to search.
 * @param href the URL to match.
 * @returns the matching descriptor and its regex matches, or undefined.
 */
export function getMatchingEmbedOnInput(
  embeds: EmbedDescriptor[],
  href: string
): { embed: EmbedDescriptor; matches: RegExpMatchArray } | undefined {
  return getMatchingEmbed(
    embeds.filter((embed) => embed.matchOnInput),
    href
  );
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
