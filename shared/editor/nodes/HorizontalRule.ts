import { InputRule } from "prosemirror-inputrules";
import Node from "./Node";

export default class HorizontalRule extends Node {
  get name() {
    return "hr";
  }

  get schema() {
    return {
      attrs: {
        markup: {
          default: "---",
        },
      },
      group: "block",
      parseDOM: [{ tag: "hr" }],
      toDOM: node => {
        return [
          "hr",
          { class: node.attrs.markup === "***" ? "page-break" : "" },
        ];
      },
    };
  }

  commands({ type }) {
    return attrs => (state, dispatch) => {
      dispatch(
        state.tr.replaceSelectionWith(type.create(attrs)).scrollIntoView()
      );
      return true;
    };
  }

  keys({ type }) {
    return {
      "Mod-_": (state, dispatch) => {
        dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
        return true;
      },
    };
  }

  inputRules({ type }) {
    return [
      new InputRule(/^(?:---|___\s|\*\*\*\s)$/, (state, match, start, end) => {
        const { tr } = state;

        if (match[0]) {
          const markup = match[0].trim();
          tr.replaceWith(start - 1, end, type.create({ markup }));
        }

        return tr;
      }),
    ];
  }

  toMarkdown(state, node) {
    state.write(`\n${node.attrs.markup}`);
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      node: "hr",
      getAttrs: tok => ({
        markup: tok.markup,
      }),
    };
  }
}
