import Node from "./Node";
import { isInTable } from "prosemirror-tables";
import breakRule from "../rules/breaks";

export default class HardBreak extends Node {
  get name() {
    return "br";
  }

  get schema() {
    return {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM() {
        return ["br"];
      },
    };
  }

  get rulePlugins() {
    return [breakRule];
  }

  commands({ type }) {
    return () => (state, dispatch) => {
      dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
      return true;
    };
  }

  keys({ type }) {
    return {
      "Shift-Enter": (state, dispatch) => {
        if (!isInTable(state)) return false;
        dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
        return true;
      },
    };
  }

  toMarkdown(state) {
    state.write(" \\n ");
  }

  parseMarkdown() {
    return { node: "br" };
  }
}
