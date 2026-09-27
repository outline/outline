import type { ResolvedPos } from "prosemirror-model";
import { type Node } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { CellSelection, inSameTable, TableMap } from "prosemirror-tables";
import type { Mappable } from "prosemirror-transform";
import { getCellsStartingInRow } from "../lib/table";

export class RowSelection extends CellSelection {
  constructor(
    public $anchorCell: ResolvedPos,
    public $headCell: ResolvedPos,
    public anchorIndex: number = 0,
    public headIndex: number = anchorIndex
  ) {
    super($anchorCell, $headCell);
  }

  /**
   * Check whether a row is part of the selection.
   *
   * @param index the visual index of the row.
   * @returns true if the row is within the selected range.
   */
  containsRow(index: number): boolean {
    return (
      index >= Math.min(this.anchorIndex, this.headIndex) &&
      index <= Math.max(this.anchorIndex, this.headIndex)
    );
  }

  getBookmark(): RowBookmark {
    return new RowBookmark(
      this.$anchorCell.pos,
      this.$headCell.pos,
      this.anchorIndex,
      this.headIndex
    );
  }

  /**
   * A row selection always covers whole rows, even when its anchor cells do
   * not start in the first or last column because of merged cells.
   *
   * @returns true.
   */
  isRowSelection(): boolean {
    return true;
  }

  /**
   * Iterate over the cells that overlap the selected rows. A cell that spans
   * several rows widens the selection rectangle, so rows outside of the
   * selected range are skipped.
   *
   * @param f the function to call for each cell.
   */
  forEachCell(f: (node: Node, pos: number) => void): void {
    const table = this.$anchorCell.node(-1);
    const map = TableMap.get(table);
    const top = Math.min(this.anchorIndex, this.headIndex);
    const bottom = Math.max(this.anchorIndex, this.headIndex) + 1;
    if (bottom > map.height) {
      super.forEachCell(f);
      return;
    }

    const tableStart = this.$anchorCell.start(-1);
    const cells = map.cellsInRect({ left: 0, right: map.width, top, bottom });
    for (const pos of cells) {
      const node = table.nodeAt(pos);
      if (node) {
        f(node, tableStart + pos);
      }
    }
  }

  /**
   * Create a selection of the rows between the given indices.
   *
   * @param $cell a resolved position of any cell in the table.
   * @param anchorIndex the index of the row the selection starts from.
   * @param headIndex the index of the row the selection extends to.
   * @returns the row selection.
   */
  public static fromIndex(
    $cell: ResolvedPos,
    anchorIndex: number,
    headIndex: number = anchorIndex
  ): RowSelection {
    const table = $cell.node(-1);
    const map = TableMap.get(table);
    const tableStart = $cell.start(-1);
    const doc = $cell.node(0);

    // Anchor on cells that start in the selected rows where possible, as a
    // cell spanning from a row above would widen the selection to that row.
    const anchorPos =
      getCellsStartingInRow(map, anchorIndex)[0] ??
      map.map[anchorIndex * map.width];
    const headPos =
      getCellsStartingInRow(map, headIndex).at(-1) ??
      map.map[(headIndex + 1) * map.width - 1];
    const $anchorCell = doc.resolve(tableStart + anchorPos);
    const $headCell = doc.resolve(tableStart + headPos);
    return new RowSelection($anchorCell, $headCell, anchorIndex, headIndex);
  }
}

export class RowBookmark {
  constructor(
    public anchor: number,
    public head: number,
    public anchorIndex: number = 0,
    public headIndex: number = anchorIndex
  ) {}

  map(mapping: Mappable): RowBookmark {
    return new RowBookmark(
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
      return new RowSelection(
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
