import { EmbedDescriptor } from "../embeds";

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
