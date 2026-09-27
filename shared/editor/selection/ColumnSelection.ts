import type { ResolvedPos } from "prosemirror-model";
import { type Node } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { CellSelection, inSameTable, TableMap } from "prosemirror-tables";
import type { Mappable } from "prosemirror-transform";
import { getCellsStartingInColumn } from "../lib/table";

export class ColumnSelection extends CellSelection {
  constructor(
    public $anchorCell: ResolvedPos,
    public $headCell: ResolvedPos,
    public anchorIndex: number = 0,
    public headIndex: number = anchorIndex
  ) {
    super($anchorCell, $headCell);
  }

  /**
   * Check whether a column is part of the selection.
   *
   * @param index the visual index of the column.
   * @returns true if the column is within the selected range.
   */
  containsColumn(index: number): boolean {
    return (
      index >= Math.min(this.anchorIndex, this.headIndex) &&
      index <= Math.max(this.anchorIndex, this.headIndex)
    );
  }

  getBookmark(): ColumnBookmark {
    return new ColumnBookmark(
      this.$anchorCell.pos,
      this.$headCell.pos,
      this.anchorIndex,
      this.headIndex
    );
  }

  /**
   * A column selection always covers whole columns, even when its anchor
   * cells do not start in the first or last row because of merged cells.
   *
   * @returns true.
   */
  isColSelection(): boolean {
    return true;
  }

  /**
   * Iterate over the cells that overlap the selected columns. A cell that
   * spans several columns widens the selection rectangle, so columns outside
   * of the selected range are skipped.
   *
   * @param f the function to call for each cell.
   */
  forEachCell(f: (node: Node, pos: number) => void): void {
    const table = this.$anchorCell.node(-1);
    const map = TableMap.get(table);
    const left = Math.min(this.anchorIndex, this.headIndex);
    const right = Math.max(this.anchorIndex, this.headIndex) + 1;
    if (right > map.width) {
      super.forEachCell(f);
      return;
    }

    const tableStart = this.$anchorCell.start(-1);
    const cells = map.cellsInRect({ left, right, top: 0, bottom: map.height });
    for (const pos of cells) {
      const node = table.nodeAt(pos);
      if (node) {
        f(node, tableStart + pos);
      }
    }
  }

  /**
   * Create a selection of the columns between the given indices.
   *
   * @param $cell a resolved position of any cell in the table.
   * @param anchorIndex the index of the column the selection starts from.
   * @param headIndex the index of the column the selection extends to.
   * @returns the column selection.
   */
  public static fromIndex(
    $cell: ResolvedPos,
    anchorIndex: number,
    headIndex: number = anchorIndex
  ): ColumnSelection {
    const table = $cell.node(-1);
    const map = TableMap.get(table);
    const tableStart = $cell.start(-1);
    const doc = $cell.node(0);

    // Anchor on cells that start in the selected columns where possible, as a
    // cell spanning from a column before would widen the selection to it.
    const anchorPos =
      getCellsStartingInColumn(map, anchorIndex)[0] ?? map.map[anchorIndex];
    const headPos =
      getCellsStartingInColumn(map, headIndex).at(-1) ??
      map.map[(map.height - 1) * map.width + headIndex];
    const $anchorCell = doc.resolve(tableStart + anchorPos);
    const $headCell = doc.resolve(tableStart + headPos);
    return new ColumnSelection($anchorCell, $headCell, anchorIndex, headIndex);
  }
}

export class ColumnBookmark {
  constructor(
    public anchor: number,
    public head: number,
    public anchorIndex: number = 0,
    public headIndex: number = anchorIndex
  ) {}

  map(mapping: Mappable): ColumnBookmark {
    return new ColumnBookmark(
      mapping.map(this.anchor),
      mapping.map(this.head),
      this.anchorIndex,
      this.headIndex
    );
  }

  resolve(doc: Node): CellSelection | Selection {
    const $anchorCell = doc.resolve(this.anchor),
      $headCell = doc.resolve(this.head);
    if (
      $anchorCell.parent.type.spec.tableRole === "row" &&
      $headCell.parent.type.spec.tableRole === "row" &&
      $anchorCell.index() < $anchorCell.parent.childCount &&
      $headCell.index() < $headCell.parent.childCount &&
      inSameTable($anchorCell, $headCell)
    ) {
      return new ColumnSelection(
        $anchorCell,
        $headCell,
        this.anchorIndex,
        this.headIndex
      );
    } else {
      return Selection.near($headCell, 1);
    }
  }
}
