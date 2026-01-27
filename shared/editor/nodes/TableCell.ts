import type { Token } from "markdown-it";
import {
  type Node as ProsemirrorNode,
  type NodeSpec,
  Slice,
} from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { TableMap } from "prosemirror-tables";
import { getCellAttrs, setCellAttrs } from "../lib/table";
import Node from "./Node";
import { presetColors, rgbaToHex } from "@shared/utils/color";
import { parseToRgb, transparentize } from "polished";
import type { RgbaColor } from "polished/lib/types/color";

export default class TableCell extends Node {
  /** The default opacity of the table cell background */
  static opacity = 0.7;

  /** Preset colors with opacity applied, used for table cell backgrounds */
  static presetColors = presetColors.map((preset) => ({
    hex: rgbaToHex(
      parseToRgb(transparentize(1 - TableCell.opacity, preset.hex)) as RgbaColor
    ),
    name: preset.name,
  }));

  /**
   * Checks if a color is one of the table cell preset colors.
   *
   * @param color - A hex color string to check.
   * @returns true if the color matches a preset color's hex value.
   */
  static isPresetColor(color: string): boolean {
    return TableCell.presetColors.some((c) => c.hex === color);
  }

  get name() {
    return "td";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      tableRole: "cell",
      group: "cell",
      isolating: true,
      parseDOM: [{ tag: "td", getAttrs: getCellAttrs }],
      toDOM(node) {
        return ["td", setCellAttrs(node), 0];
      },
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        alignment: { default: null },
        colwidth: { default: null },
        marks: {
          default: undefined,
        },
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
    const createCellDecorations = (state: EditorState) => {
      const { doc } = state;
      const decorations: Decoration[] = [];

      // Iterate through all tables in the document
      doc.descendants((node: ProsemirrorNode, pos: number) => {
        if (node.type.spec.tableRole === "table") {
          const map = TableMap.get(node);

          // Mark cells in the first column and last row of this table
          node.descendants((cellNode: ProsemirrorNode, cellPos: number) => {
            if (
              cellNode.type.spec.tableRole === "cell" ||
              cellNode.type.spec.tableRole === "header_cell"
            ) {
              const cellOffset = cellPos;
              const cellIndex = map.map.indexOf(cellOffset);

              if (cellIndex !== -1) {
                const col = cellIndex % map.width;
                const row = Math.floor(cellIndex / map.width);
                const rowspan = cellNode.attrs.rowspan || 1;
                const colspan = cellNode.attrs.colspan || 1;
                const attrs: Record<string, string> = {};

                if (col === 0) {
                  attrs["data-first-column"] = "true";
                }

                // Mark cells that extend into the last column (accounting for colspan)
                if (col + colspan >= map.width) {
                  attrs["data-last-column"] = "true";
                }

                // Mark cells that extend into the last row (accounting for rowspan)
                if (row + rowspan >= map.height) {
                  attrs["data-last-row"] = "true";
                }

                if (Object.keys(attrs).length > 0) {
                  decorations.push(
                    Decoration.node(
                      pos + cellPos + 1,
                      pos + cellPos + 1 + cellNode.nodeSize,
                      attrs
                    )
                  );
                }
              }
            }
          });
        }
      });

      return DecorationSet.create(doc, decorations);
    };

    return [
      new Plugin({
        key: new PluginKey("table-cell-attributes"),
        state: {
          init: (_, state) => createCellDecorations(state),
          apply: (tr, pluginState, oldState, newState) => {
            // Only recompute if document changed
            if (!tr.docChanged) {
              return pluginState;
            }

            return createCellDecorations(newState);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
      new Plugin({
        key: new PluginKey("table-cell-copy-transform"),
        props: {
          transformCopied: (slice) => {
            // check if the copied selection is a single table, with a single row, with a single cell. If so,
            // copy the cell content only – not a table with a single cell. This leads to more predictable pasting
            // behavior, both in and outside the app.
            if (slice.content.childCount === 1) {
              const table = slice.content.firstChild;
              if (
                table?.type.spec.tableRole === "table" &&
                table.childCount === 1
              ) {
                const row = table.firstChild;
                if (
                  row?.type.spec.tableRole === "row" &&
                  row.childCount === 1
                ) {
                  const cell = row.firstChild;
                  if (cell?.type.spec.tableRole === "cell") {
                    return new Slice(
                      cell.content,
                      slice.openStart,
                      slice.openEnd
                    );
                  }
                }
              }
            }

            return slice;
          },
        },
      }),
    ];
  }
}
