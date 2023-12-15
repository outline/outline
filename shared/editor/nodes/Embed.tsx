import Token from "markdown-it/lib/token";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Command } from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { sanitizeUrl } from "../../utils/urls";
import DisabledEmbed from "../components/DisabledEmbed";
import Frame from "../components/Frame";
import defaultEmbeds, { EmbedDescriptor } from "../embeds";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import embedsRule from "../rules/embeds";
import { ComponentProps } from "../types";
import Node from "./Node";

function getMatchingEmbed(
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

export default class Embed extends Node {
  get name() {
    return "embed";
  }

  get schema(): NodeSpec {
    return {
      content: "inline*",
      group: "block",
      atom: true,
      attrs: {
        href: {},
      },
      parseDOM: [
        {
          tag: "iframe",
          getAttrs: (dom: HTMLIFrameElement) => {
            const embeds = this.editor?.props.embeds ?? defaultEmbeds;
            const href = dom.getAttribute("data-canonical-url") || "";
            const response = getMatchingEmbed(embeds, href);

            if (response) {
              return {
                href,
              };
            }

            return false;
          },
        },
        {
          tag: "a.embed",
          getAttrs: (dom: HTMLAnchorElement) => ({
            href: dom.getAttribute("href"),
          }),
        },
      ],
      toDOM: (node) => {
        const embeds = this.editor?.props.embeds ?? defaultEmbeds;
        const response = getMatchingEmbed(embeds, node.attrs.href);
        const src = response?.embed.transformMatch?.(response.matches);

        if (src) {
          return [
            "iframe",
            {
              class: "embed",
              frameborder: "0",
              src: sanitizeUrl(src),
              contentEditable: "false",
              allowfullscreen: "true",
              "data-canonical-url": sanitizeUrl(node.attrs.href),
            },
          ];
        } else {
          return [
            "a",
            {
              class: "embed",
              href: sanitizeUrl(node.attrs.href),
              contentEditable: "false",
              "data-canonical-url": sanitizeUrl(node.attrs.href),
            },
            response?.embed.title ?? node.attrs.href,
          ];
        }
      },
      toPlainText: (node) => node.attrs.href,
    };
  }

  get rulePlugins() {
    return [embedsRule(this.options.embeds)];
  }

  component(props: ComponentProps) {
    const { embeds, embedsDisabled } = this.editor.props;

    return (
      <EmbedComponent
        {...props}
        embeds={embeds}
        embedsDisabled={embedsDisabled}
      />
    );
  }

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, Primitive>): Command =>
      (state, dispatch) => {
        dispatch?.(
          state.tr.replaceSelectionWith(type.create(attrs)).scrollIntoView()
        );
        return true;
      };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    if (!state.inTable) {
      state.ensureNewLine();
    }

    const href = node.attrs.href.replace(/_/g, "%5F");

    state.write(
      "[" + state.esc(href, false) + "](" + state.esc(href, false) + ")"
    );
    if (!state.inTable) {
      state.write("\n\n");
    }
  }

  parseMarkdown() {
    return {
      node: "embed",
      getAttrs: (token: Token) => ({
        href: token.attrGet("href"),
      }),
    };
  }
}

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
        attrs={{ href: node.attrs.href }}
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
        canonicalUrl={node.attrs.href}
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
        attrs={{ ...node.attrs, matches }}
        isEditable={isEditable}
        isSelected={isSelected}
        embed={embed}
        theme={theme}
      />
    );
  }

  return null;
};
