import copy from "copy-to-clipboard";
import filter from "lodash/filter";
import forEach from "lodash/forEach";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import {
  Node as ProsemirrorNode,
  NodeSpec,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command, Plugin, Selection, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { toast } from "sonner";
import { Primitive } from "utility-types";
import Storage from "../../utils/Storage";
import backspaceToParagraph from "../commands/backspaceToParagraph";
import splitHeading from "../commands/splitHeading";
import toggleBlockType from "../commands/toggleBlockType";
import headingToSlug, { headingToPersistenceKey } from "../lib/headingToSlug";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { findBlockNodes } from "../queries/findChildren";
import { findCollapsedNodes } from "../queries/findCollapsedNodes";
import Node from "./Node";

export default class Heading extends Node {
  className = "heading-name";

  get name() {
    return "heading";
  }

  get defaultOptions() {
    return {
      levels: [1, 2, 3, 4],
      collapsed: undefined,
    };
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        level: {
          default: 1,
          validate: "number",
        },
        collapsed: {
          default: undefined,
        },
      },
      content: "inline*",
      group: "block",
      defining: true,
      draggable: false,
      parseDOM: this.options.levels.map((level: number) => ({
        tag: `h${level}`,
        attrs: { level },
        contentElement: (node: HTMLHeadingElement) =>
          node.querySelector(".heading-content") || node,
      })),
      toDOM: (node) => {
        let anchor;
        if (typeof document !== "undefined") {
          anchor = document.createElement("button");
          anchor.innerText = "#";
          anchor.type = "button";
          anchor.className = "heading-anchor";
          anchor.addEventListener("click", this.handleCopyLink);
        }

        return [
          `h${node.attrs.level + (this.options.offset || 0)}`,
          {
            dir: "auto",
          },
          [
            "span",
            {
              contentEditable: "false",
              class: `heading-actions ${
                node.attrs.collapsed ? "collapsed" : ""
              }`,
            },
            ...(anchor ? [anchor] : []),
          ],
          [
            "span",
            {
              class: "heading-content",
            },
            0,
          ],
        ];
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(state.repeat("#", node.attrs.level) + " ");
    state.renderInline(node);
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "heading",
      getAttrs: (token: Record<string, any>) => ({
        level: +token.tag.slice(1),
      }),
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, Primitive>) =>
      toggleBlockType(type, schema.nodes.paragraph, attrs);
  }

  handleFoldContent = (event: MouseEvent) => {
    event.preventDefault();
    if (
      !(event.currentTarget instanceof HTMLButtonElement) ||
      event.button !== 0
    ) {
      return;
    }

    const { view } = this.editor;
    const hadFocus = view.hasFocus();
    const { tr } = view.state;
    const { top, left } = event.currentTarget.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const node = view.state.doc.nodeAt(result.inside);

      if (node) {
        const endOfHeadingPos = result.inside + node.nodeSize;
        const $pos = view.state.doc.resolve(endOfHeadingPos);
        const collapsed = !node.attrs.collapsed;

        if (collapsed && view.state.selection.to > endOfHeadingPos) {
          // move selection to the end of the collapsed heading
          tr.setSelection(Selection.near($pos, -1));
        }

        const transaction = tr.setNodeMarkup(result.inside, undefined, {
          ...node.attrs,
          collapsed,
        });

        const persistKey = headingToPersistenceKey(node, this.editor.props.id);

        if (collapsed) {
          Storage.set(persistKey, "collapsed");
        } else {
          Storage.remove(persistKey);
        }

        view.dispatch(transaction);

        if (hadFocus) {
          view.focus();
        }
      }
    }
  };

  handleCopyLink = (event: MouseEvent) => {
    // this is unfortunate but appears to be the best way to grab the anchor
    // as it's added directly to the dom by a decoration.
    const anchor =
      event.currentTarget instanceof HTMLButtonElement &&
      (event.currentTarget.parentNode?.parentNode
        ?.previousSibling as HTMLElement);

    if (!anchor || !anchor.className.includes(this.className)) {
      throw new Error("Did not find anchor as previous sibling of heading");
    }
    const hash = `#${anchor.id}`;

    // the existing url might contain a hash already, lets make sure to remove
    // that rather than appending another one.
    const normalizedUrl = window.location.href
      .split("#")[0]
      .replace("/edit", "");
    copy(normalizedUrl + hash);

    toast.message(this.options.dictionary.linkCopied);
  };

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    const options = this.options.levels.reduce(
      (items: Record<string, Command>, level: number) => ({
        ...items,
        ...{
          [`Shift-Ctrl-${level}`]: toggleBlockType(
            type,
            schema.nodes.paragraph,
            { level }
          ),
        },
      }),
      {}
    );

    return {
      ...options,
      Backspace: backspaceToParagraph(type),
      Enter: splitHeading(type),
    };
  }

  get plugins() {
    const getAnchors = (doc: ProsemirrorNode) => {
      const decorations: Decoration[] = [];
      const previouslySeen: Record<string, number> = {};

      doc.descendants((node, pos) => {
        if (node.type.name !== this.name) {
          return;
        }

        // calculate the optimal id
        const slug = headingToSlug(node);
        let id = slug;

        // check if we've already used it, and if so how many times?
        // Make the new id based on that number ensuring that we have
        // unique ID's even when headings are identical
        if (previouslySeen[slug] > 0) {
          id = headingToSlug(node, previouslySeen[slug]);
        }

        // record that we've seen this slug for the next loop
        previouslySeen[slug] =
          previouslySeen[slug] !== undefined ? previouslySeen[slug] + 1 : 1;

        decorations.push(
          Decoration.widget(
            pos,
            () => {
              const anchor = document.createElement("a");
              anchor.id = id;
              anchor.className = this.className;
              return anchor;
            },
            {
              side: -1,
              key: id,
            }
          )
        );
      });

      return DecorationSet.create(doc, decorations);
    };

    const plugin: Plugin = new Plugin({
      state: {
        init: (config, state) => getAnchors(state.doc),
        apply: (tr, oldState) =>
          tr.docChanged ? getAnchors(tr.doc) : oldState,
      },
      props: {
        decorations: (state) => plugin.getState(state),
      },
    });

    // Plugin to forcibly revert all collapsed headings to expanded state
    const expandHeadingsPlugin: Plugin = new Plugin({
      appendTransaction: (transactions, oldState, newState) => {
        const docChanged = transactions.some((tr) => tr.docChanged);
        let tr: Transaction | null = null;
        if (docChanged) {
          forEach(
            filter(
              findBlockNodes(newState.doc, true),
              (block) => block.node.type === newState.schema.nodes.heading
            ),
            (heading) => {
              tr = (tr ?? newState.tr).setNodeAttribute(
                heading.pos,
                "collapsed",
                undefined
              );
            }
          );
        }
        return tr;
      },
    });

    const foldPlugin: Plugin = new Plugin({
      props: {
        decorations: (state) => {
          const { doc } = state;
          const decorations: Decoration[] = findCollapsedNodes(doc).map(
            (block) =>
              Decoration.node(block.pos, block.pos + block.node.nodeSize, {
                class: "folded-content",
              })
          );

          return DecorationSet.create(doc, decorations);
        },
      },
    });

    return [plugin, expandHeadingsPlugin, foldPlugin];
  }

  inputRules({ type }: { type: NodeType }) {
    return this.options.levels.map((level: number) =>
      textblockTypeInputRule(new RegExp(`^(#{1,${level}})\\s$`), type, () => ({
        level,
      }))
    );
  }
}
