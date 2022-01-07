import { DecorationSet, Decoration } from "prosemirror-view";
import { Plugin } from "prosemirror-state";
import { isColumnSelected, getCellsInRow } from "prosemirror-utils";
import Node from "./Node";

export default class TableHeadCell extends Node {
  get name() {
    return "th";
  }

  get schema() {
    return {
      content: "paragraph+",
      tableRole: "header_cell",
      isolating: true,
      parseDOM: [{ tag: "th" }],
      toDOM(node) {
        return [
          "th",
          node.attrs.alignment
            ? { style: `text-align: ${node.attrs.alignment}` }
            : {},
          0,
        ];
      },
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        alignment: { default: null },
      },
    };
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return {
      block: "th",
      getAttrs: tok => ({ alignment: tok.info }),
    };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          decorations: state => {
            const { doc, selection } = state;
            const decorations: Decoration[] = [];
            const cells = getCellsInRow(0)(selection);

            if (cells) {
              cells.forEach(({ pos }, index) => {
                decorations.push(
                  Decoration.widget(pos + 1, () => {
                    const colSelected = isColumnSelected(index)(selection);
                    let className = "grip-column";
                    if (colSelected) {
                      className += " selected";
                    }
                    if (index === 0) {
                      className += " first";
                    } else if (index === cells.length - 1) {
                      className += " last";
                    }
                    const grip = document.createElement("a");
                    grip.className = className;
                    grip.addEventListener("mousedown", event => {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      this.options.onSelectColumn(index, state);
                    });
                    return grip;
                  })
                );
              });
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  }
}
