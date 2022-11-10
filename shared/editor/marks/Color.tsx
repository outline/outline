import { toggleMark } from "prosemirror-commands";
import { InputRule } from "prosemirror-inputrules";
import { TokenConfig } from "prosemirror-markdown";
import { MarkSpec, MarkType, Node as ProsemirrorNode } from "prosemirror-model";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Mark from "./Mark";

const COLOR_INPUT_REGEX = /^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$/;

export default class Color extends Mark {
  get name() {
    return "color";
  }

  get schema(): MarkSpec {
    return {
      attrs: {
        color: {
          default: "",
        },
      },
      parseDOM: [
        {
          tag: "span[color]",
          getAttrs: (node: HTMLElement) => ({
            color: node.style.color ? node.style.color : "red",
          }),
        },
      ],
      toDOM: (node) => [
        "span",
        {
          ...node.attrs,
          class: `custom-color`,
          style: `color:${node.attrs.color}`,
          color: `${node.attrs.color}`,
        },
        0,
      ],
    };
  }

  inputRules({ type }: { type: MarkType }): InputRule[] {
    return [COLOR_INPUT_REGEX, type];
  }

  keys({ type }: { type: MarkType }) {
    return {
      "Mod-b": toggleMark(type),
      "Mod-B": toggleMark(type),
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    console.error("toMarkdown not implemented", state, node);
  }

  parseMarkdown(): TokenConfig | void {
    return undefined;
  }
}
