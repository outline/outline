import Token from "markdown-it/lib/token";
import { NodeSpec } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { addRow, selectedRect } from "prosemirror-tables";
import { DecorationSet, Decoration } from "prosemirror-view";
import { selectRow, selectTable } from "../commands/table";
import {
  getCellsInColumn,
  isRowSelected,
  isTableSelected,
} from "../queries/table";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { cn } from "../styles/utils";
import Node from "./Node";

export default class TableCell extends Node {
  get name() {
    return "td";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      tableRole: "cell",
      isolating: true,
      parseDOM: [{ tag: "td" }],
      toDOM(node) {
        return [
          "td",
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
      block: "td",
      getAttrs: (tok: Token) => ({ alignment: tok.info }),
    };
  }

  get plugins() {
    function buildAddRowDecoration(pos: number, index: number) {
      return Decoration.widget(
        pos + 1,
        () => {
          const className = cn(EditorStyleHelper.tableAddRow, {
            first: index === 0,
          });
          const plus = document.createElement("a");
          plus.role = "button";
          plus.className = className;
          plus.addEventListener("mousedown", (event) => {
            // TODO: Move to plugin dom handler
            event.preventDefault();
            event.stopImmediatePropagation();
            this.editor.view.dispatch(
              addRow(
                this.editor.view.state.tr,
                selectedRect(this.editor.view.state),
                index
              )
            );
          });
          return plus;
        },
        {
          key: cn(EditorStyleHelper.tableAddRow, index),
        }
      );
    }

    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            const rows = getCellsInColumn(0)(state);

            if (rows) {
              rows.forEach((pos, index) => {
                if (index === 0) {
                  const className = cn(EditorStyleHelper.tableGrip, {
                    selected: isTableSelected(state),
                  });

                  decorations.push(
                    Decoration.widget(
                      pos + 1,
                      () => {
                        const grip = document.createElement("a");
                        grip.role = "button";
                        grip.className = className;
                        grip.addEventListener("mousedown", (event) => {
                          event.preventDefault();
                          event.stopImmediatePropagation();
                          this.editor.view.dispatch(selectTable(state));
                        });
                        return grip;
                      },
                      {
                        key: className,
                      }
                    )
                  );
                }

                const className = cn(EditorStyleHelper.tableGripRow, {
                  selected: isRowSelected(index)(state),
                  first: index === 0,
                  last: index === rows.length - 1,
                });

                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const grip = document.createElement("a");
                      grip.role = "button";
                      grip.className = className;
                      grip.addEventListener("mousedown", (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        this.editor.view.dispatch(
                          selectRow(
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

                if (index === 0) {
                  decorations.push(buildAddRowDecoration(pos, index));
                }

                decorations.push(buildAddRowDecoration(pos, index + 1));
              });
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  }
}
