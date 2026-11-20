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
import { contentWidth } from "../lib/contentWidth";
import { toggleAspectRatioLock } from "../commands/toggleAspectRatioLock";
import EmbedComponent from "../components/Embed";
import defaultEmbeds from "../embeds";
import { getMatchingEmbed, transformListToEmbeds } from "../lib/embeds";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import type { ComponentProps } from "../types";
import Node from "./Node";
import { isInList } from "../queries/isInList";
import { findParentNodeClosestToPos } from "../queries/findParentNode";
import { isList } from "../queries/isList";

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
        // Unset means the default for the node type, see isAspectRatioLocked.
        lockAspectRatio: {
          default: null,
          validate: "boolean|null",
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
      leafText: (node) => node.attrs.href,
    };
  }

  handleChangeSize =
    ({
      node,
      getPos,
    }: {
      node: ProsemirrorNode;
      getPos: () => number | undefined;
    }) =>
    ({ width, height }: { width: number; height?: number }) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      if (pos === undefined) {
        return;
      }

      const transaction = tr
        .setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width: this.storedWidth(width),
          height,
        })
        .setMeta("addToHistory", true);
      const $pos = transaction.doc.resolve(pos);
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
      toggleEmbedAspectRatioLock: (): Command => toggleAspectRatioLock(type),
      resizeEmbed:
        ({ width, height }: { width: number; height: number }): Command =>
        (state, dispatch) => {
          const { selection } = state;
          if (
            !(selection instanceof NodeSelection) ||
            selection.node.type !== type
          ) {
            return false;
          }

          const transaction = state.tr
            .setNodeMarkup(selection.from, undefined, {
              ...selection.node.attrs,
              width: this.storedWidth(width),
              height,
            })
            .setMeta("addToHistory", true);
          dispatch?.(
            transaction.setSelection(
              NodeSelection.create(transaction.doc, selection.from)
            )
          );
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

  /**
   * Returns the width to store, where no width or a width at the editor edge
   * is stored as unset so the embed stays full width.
   *
   * @param width - the resized width.
   * @returns the width to store.
   */
  private storedWidth(width: number) {
    return !width || width >= contentWidth(this.editor.view.dom) ? null : width;
  }
}
