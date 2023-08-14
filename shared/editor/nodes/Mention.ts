import Token from "markdown-it/lib/token";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command, Plugin, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Primitive } from "utility-types";
import Suggestion from "../extensions/Suggestion";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { SuggestionsMenuType } from "../plugins/Suggestions";
import mentionRule from "../rules/mention";

export default class Mention extends Suggestion {
  get type() {
    return "node";
  }

  get defaultOptions() {
    return {
      type: SuggestionsMenuType.Mention,
      // ported from https://github.com/tc39/proposal-regexp-unicode-property-escapes#unicode-aware-version-of-w
      openRegex: /(?:^|\s)@([\p{L}\p{M}\d]+)?$/u,
      closeRegex: /(?:^|\s)@(([\p{L}\p{M}\d]*\s+)|(\s+[\p{L}\p{M}\d]+))$/u,
      enabledInTable: true,
    };
  }

  get name() {
    return "mention";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        type: {},
        label: {},
        modelId: {},
        actorId: {
          default: undefined,
        },
        id: {},
      },
      inline: true,
      content: "text*",
      marks: "",
      group: "inline",
      atom: true,
      parseDOM: [
        {
          tag: `span.${this.name}`,
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLElement) => ({
            type: dom.dataset.type,
            modelId: dom.dataset.id,
            actorId: dom.dataset.actorId,
            label: dom.innerText,
            id: dom.id,
          }),
        },
      ],
      toDOM: (node) => [
        "span",
        {
          class: `${node.type.name}`,
          id: node.attrs.id,
          "data-type": node.attrs.type,
          "data-id": node.attrs.modelId,
          "data-actorId": node.attrs.actorId,
          "data-url": `mention://${node.attrs.id}/${node.attrs.type}/${node.attrs.modelId}`,
        },
        node.attrs.label,
      ],
      toPlainText: (node) => `@${node.attrs.label}`,
    };
  }

  get rulePlugins() {
    return [mentionRule];
  }

  get plugins(): Plugin[] {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mouseover: (view: EditorView, event: MouseEvent) => {
              const target = (event.target as HTMLElement)?.closest("span");
              if (
                target instanceof HTMLSpanElement &&
                this.editor.elementRef.current?.contains(target) &&
                target.className.includes("mention") &&
                (!view.editable || (view.editable && !view.hasFocus()))
              ) {
                if (this.options.onHoverLink) {
                  return this.options.onHoverLink(target);
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  }

  commands({ type }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, Primitive>): Command =>
      (state, dispatch) => {
        const { selection } = state;
        const position =
          selection instanceof TextSelection
            ? selection.$cursor?.pos
            : selection.$to.pos;
        if (position === undefined) {
          return false;
        }

        const node = type.create(attrs);
        const transaction = state.tr.insert(position, node);
        dispatch?.(transaction);
        return true;
      };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    const mType = node.attrs.type;
    const mId = node.attrs.modelId;
    const label = node.attrs.label;
    const id = node.attrs.id;

    state.write(`@[${label}](mention://${id}/${mType}/${mId})`);
  }

  parseMarkdown() {
    return {
      node: "mention",
      getAttrs: (tok: Token) => ({
        id: tok.attrGet("id"),
        type: tok.attrGet("type"),
        modelId: tok.attrGet("modelId"),
        label: tok.content,
      }),
    };
  }
}
