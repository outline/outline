import Token from "markdown-it/lib/token";
import { NodeSpec } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";
import { selectColumn } from "../commands/table";
import { getCellsInRow, isColumnSelected } from "../queries/table";

import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { cn } from "../styles/utils";
import Node from "./Node";

export default class TableHeadCell extends Node {
  get name() {
    return "th";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
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
        colwidth: { default: null },
      },
    };
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return {
      block: "th",
      getAttrs: (tok: Token) => ({ alignment: tok.info }),
    };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            const cells = getCellsInRow(0)(state);

            if (cells) {
              cells.forEach((pos, index) => {
                const colSelected = isColumnSelected(index)(state);
                let className = EditorStyleHelper.tableGripColumn;
                if (colSelected) {
                  className += " selected";
                }
                if (index === 0) {
                  className += " first";
                } else if (index === cells.length - 1) {
                  className += " last";
                }
                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const grip = document.createElement("a");
                      grip.className = className;
                      grip.addEventListener("mousedown", (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        this.editor.view.dispatch(
                          selectColumn(
                            index,
                            event.metaKey || event.shiftKey
                          )(state)
                        );
                      });
                      return grip;
                    },
                    {
                      key: cn(className, index),
                    }
                  )
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
