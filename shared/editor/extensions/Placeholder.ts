import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "../lib/Extension";

export default class Placeholder extends Extension {
  get name() {
    return "empty-placeholder";
  }

  get defaultOptions() {
    return {
      emptyNodeClass: "placeholder",
      placeholder: "",
    };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            const completelyEmpty =
              doc.childCount <= 1 &&
              doc.content.size <= 2 &&
              doc.textContent === "";

            if (completelyEmpty) {
              doc.descendants((node, pos) => {
                if (pos !== 0 || node.type.name !== "paragraph") {
                  return;
                }

                const decoration = Decoration.node(pos, pos + node.nodeSize, {
                  class: this.options.emptyNodeClass,
                  "data-empty-text": this.options.placeholder,
                });
                decorations.push(decoration);
              });
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  }
}
