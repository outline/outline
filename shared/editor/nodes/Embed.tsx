import type Token from "markdown-it/lib/token.mjs";
import {
  Fragment,
  Slice,
  type NodeSpec,
  type NodeType,
  type Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection, TextSelection } from "prosemirror-state";
import * as React from "react";
import type { Primitive } from "utility-types";
import { sanitizeUrl } from "../../utils/urls";
import EmbedComponent from "../components/Embed";
import defaultEmbeds from "../embeds";
import { getMatchingEmbed, transformListToEmbeds } from "../lib/embeds";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import type { ComponentProps } from "../types";
import Node from "./Node";
import { isInList } from "../queries/isInList";
import { findParentNodeClosestToPos } from "../queries/findParentNode";
import { isList } from "../queries/isList";

const parseDimension = (value: string | null): number | null => {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
};

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
        href: {
          validate: "string",
        },
        width: {
          default: null,
        },
        height: {
          default: null,
        },
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
                width: parseDimension(dom.getAttribute("width")),
                height: parseDimension(dom.getAttribute("height")),
              };
            }

            return false;
          },
        },
        {
          tag: "a.embed",
          getAttrs: (dom: HTMLAnchorElement) => ({
            href: dom.getAttribute("href"),
            width: parseDimension(dom.getAttribute("data-width")),
            height: parseDimension(dom.getAttribute("data-height")),
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
              width: node.attrs.width,
              height: node.attrs.height,
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
              "data-width": node.attrs.width,
              "data-height": node.attrs.height,
              "data-canonical-url": sanitizeUrl(node.attrs.href),
            },
            response?.embed.title ?? node.attrs.href,
          ];
        }
      },
      leafText: (node) => node.attrs.href,
    };
  }

  handleChangeSize =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    ({ width, height }: { width: number; height?: number }) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      const transaction = tr
        .setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width,
          height,
        })
        .setMeta("addToHistory", true);
      const $pos = transaction.doc.resolve(getPos());
      view.dispatch(transaction.setSelection(new NodeSelection($pos)));
    };

  component = (props: ComponentProps) => {
    const { embeds, embedsDisabled } = this.editor.props;

    return (
      <EmbedComponent
        {...props}
        embeds={embeds}
        embedsDisabled={embedsDisabled}
        onChangeSize={this.handleChangeSize(props)}
      />
    );
  };

  commands({ type }: { type: NodeType }) {
    return {
      resizeEmbed:
        ({ width, height }: { width?: number; height: number }): Command =>
        (state, dispatch) => {
          if (!(state.selection instanceof NodeSelection)) {
            return false;
          }

          const { selection } = state;
          const transformedAttrs = {
            ...selection.node.attrs,
            width: width ?? null,
            height,
          };

          const tr = state.tr
            .setNodeMarkup(selection.from, undefined, transformedAttrs)
            .setMeta("addToHistory", true);

          const $pos = tr.doc.resolve(selection.from);
          dispatch?.(tr.setSelection(new NodeSelection($pos)));
          return true;
        },
      deleteEmbed: (): Command => (state, dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        dispatch?.(state.tr.deleteSelection().scrollIntoView());
        return true;
      },
      embed:
        (attrs: Record<string, Primitive>): Command =>
        (state, dispatch) => {
          dispatch?.(
            state.tr.replaceSelectionWith(type.create(attrs)).scrollIntoView()
          );
          return true;
        },
      embed_list:
        (_attrs: Record<string, Primitive>): Command =>
        (state, dispatch) => {
          const { selection } = state;
          const position =
            selection instanceof TextSelection
              ? selection.$cursor?.pos
              : selection.$to.pos;

          if (position === undefined || !isInList(state)) {
            return false;
          }

          const resolvedPos = state.tr.doc.resolve(position);
          const nodeWithPos = findParentNodeClosestToPos(resolvedPos, (node) =>
            isList(node, this.editor.schema)
          );

          if (!nodeWithPos) {
            return false;
          }

          const listNode = nodeWithPos.node,
            from = nodeWithPos.pos,
            to = from + listNode.nodeSize;

          const nodes = transformListToEmbeds(listNode, this.editor.schema);
          const slice = new Slice(Fragment.fromArray(nodes), 0, 0);

          const tr = state.tr.deleteRange(from, to);
          dispatch?.(
            tr
              .setSelection(TextSelection.near(tr.doc.resolve(from)))
              .replaceSelection(slice)
              .scrollIntoView()
          );

          return true;
        },
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
