import Token from "markdown-it/lib/token";
import { InputRule } from "prosemirror-inputrules";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import {
  SuggestionsMenuPlugin,
  SuggestionsMenuType,
  getInputRules,
} from "../plugins/SuggestionsMenu";
import mentionRule from "../rules/mention";
import { Dispatch } from "../types";
import Node from "./Node";

export default class Mention extends Node {
  get defaultOptions() {
    return {
      type: SuggestionsMenuType.Mention,
      // ported from https://github.com/tc39/proposal-regexp-unicode-property-escapes#unicode-aware-version-of-w
      openRegex: /(?:^|\s)@([\p{L}\p{M}\d]+)?$/u,
      closeRegex: /(?:^|\s)@(([\p{L}\p{M}\d]*\s+)|(\s+[\p{L}\p{M}\d]+))$/u,
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
        },
        node.attrs.label,
      ],
      toPlainText: (node) => `@${node.attrs.label}`,
    };
  }

  get rulePlugins() {
    return [mentionRule];
  }

  get plugins() {
    return [new SuggestionsMenuPlugin(this.editor, this.options)];
  }

  inputRules = (): InputRule[] => getInputRules(this.editor, this.options);

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, string>) => (
      state: EditorState,
      dispatch: Dispatch
    ) => {
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
      dispatch(transaction);
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
