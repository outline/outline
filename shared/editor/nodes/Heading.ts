import copy from "copy-to-clipboard";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import {
  Node as ProsemirrorNode,
  NodeSpec,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command, Plugin, Selection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { toast } from "sonner";
import { Primitive } from "utility-types";
import Storage from "../../utils/Storage";
import backspaceToParagraph from "../commands/backspaceToParagraph";
import splitHeading from "../commands/splitHeading";
import toggleBlockType from "../commands/toggleBlockType";
import { headingToPersistenceKey } from "../lib/headingToSlug";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { findCollapsedNodes } from "../queries/findCollapsedNodes";
import Node from "./Node";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

export default class Heading extends Node {
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
        let anchor, fold;
        if (typeof document !== "undefined") {
          anchor = document.createElement("button");
          anchor.innerText = "#";
          anchor.type = "button";
          anchor.className = "heading-anchor";
          anchor.addEventListener("click", this.handleCopyLink);

          fold = document.createElement("button");
          fold.innerText = "";
          fold.innerHTML =
            '<svg fill="currentColor" width="12" height="24" viewBox="6 0 12 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.23823905,10.6097108 L11.207376,14.4695888 L11.207376,14.4695888 C11.54411,14.907343 12.1719566,14.989236 12.6097108,14.652502 C12.6783439,14.5997073 12.7398293,14.538222 12.792624,14.4695888 L15.761761,10.6097108 L15.761761,10.6097108 C16.0984949,10.1719566 16.0166019,9.54410997 15.5788477,9.20737601 C15.4040391,9.07290785 15.1896811,9 14.969137,9 L9.03086304,9 L9.03086304,9 C8.47857829,9 8.03086304,9.44771525 8.03086304,10 C8.03086304,10.2205442 8.10377089,10.4349022 8.23823905,10.6097108 Z" /></svg>';
          fold.type = "button";
          fold.className = `heading-fold ${
            node.attrs.collapsed ? "collapsed" : ""
          }`;
          fold.addEventListener("mousedown", (event) =>
            this.handleFoldContent(event)
          );
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
            ...(anchor ? [anchor, fold] : []),
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

    if (
      !anchor ||
      !anchor.className.includes(EditorStyleHelper.headingPositionAnchor)
    ) {
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

    return [foldPlugin];
  }

  inputRules({ type }: { type: NodeType }) {
    return this.options.levels.map((level: number) =>
      textblockTypeInputRule(new RegExp(`^(#{1,${level}})\\s$`), type, () => ({
        level,
      }))
    );
  }
}
