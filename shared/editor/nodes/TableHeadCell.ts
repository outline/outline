import Token from "markdown-it/lib/token";
import { NodeSpec } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { addColumn, selectedRect } from "prosemirror-tables";
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
            const cols = getCellsInRow(0)(state);

            if (cols) {
              cols.forEach((pos, index) => {
                const baseClassName = cn({
                  selected: isColumnSelected(index)(state),
                  first: index === 0,
                  last: index === cols.length - 1,
                });

                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const className = cn(
                        EditorStyleHelper.tableGripColumn,
                        baseClassName
                      );
                      const grip = document.createElement("a");
                      grip.role = "button";
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
                      key: cn(
                        baseClassName,
                        EditorStyleHelper.tableGripColumn,
                        index
                      ),
                    }
                  )
                );

                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const className = cn(
                        EditorStyleHelper.tableAddColumn,
                        baseClassName
                      );
                      const plus = document.createElement("a");
                      plus.role = "button";
                      plus.className = className;
                      plus.addEventListener("mousedown", (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        this.editor.view.dispatch(
                          addColumn(
                            this.editor.view.state.tr,
                            selectedRect(this.editor.view.state),
                            index
                          )
                        );
                      });
                      return plus;
                    },
                    {
                      key: cn(
                        baseClassName,
                        EditorStyleHelper.tableAddColumn,
                        index
                      ),
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
