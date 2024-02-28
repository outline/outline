import * as React from "react";
import { EmbedDescriptor } from "../embeds";
import { getMatchingEmbed } from "../lib/embeds";
import { ComponentProps } from "../types";
import DisabledEmbed from "./DisabledEmbed";
import Frame from "./Frame";

const EmbedComponent = ({
  isEditable,
  isSelected,
  theme,
  node,
  embeds,
  embedsDisabled,
}: ComponentProps & {
  embeds: EmbedDescriptor[];
  embedsDisabled?: boolean;
}) => {
  const cache = React.useMemo(
    () => getMatchingEmbed(embeds, node.attrs.href),
    [embeds, node.attrs.href]
  );

  if (!cache) {
    return null;
  }

  const { embed, matches } = cache;

  if (embedsDisabled) {
    return (
      <DisabledEmbed
        href={node.attrs.href}
        embed={embed}
        isEditable={isEditable}
        isSelected={isSelected}
        theme={theme}
      />
    );
  }

  if (embed.transformMatch) {
    const src = embed.transformMatch(matches);
    return (
      <Frame
        src={src}
        isSelected={isSelected}
        canonicalUrl={embed.hideToolbar ? undefined : node.attrs.href}
        title={embed.title}
        referrerPolicy="origin"
        border
      />
    );
  }

  if ("component" in embed) {
    return (
      // @ts-expect-error Component type
      <embed.component
        attrs={node.attrs}
        matches={matches}
        isEditable={isEditable}
        isSelected={isSelected}
        embed={embed}
        theme={theme}
      />
    );
  }

  return null;
};

export default EmbedComponent;
