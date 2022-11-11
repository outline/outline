import { TokenConfig } from "prosemirror-markdown";
import { MarkSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Mark from "./Mark";

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
          tag: "span",
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

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    console.error("toMarkdown not implemented", state, node);
  }

  parseMarkdown(): TokenConfig | void {
    return undefined;
  }
}
