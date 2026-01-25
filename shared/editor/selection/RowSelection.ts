import type { ResolvedPos } from "prosemirror-model";
import { type Node } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { CellSelection, inSameTable, TableMap } from "prosemirror-tables";
import type { Mappable } from "prosemirror-transform";

export class RowSelection extends CellSelection {
  constructor(
    public $anchorCell: ResolvedPos,
    public $headCell: ResolvedPos,
    public $index: number = 0
  ) {
    super($anchorCell, $headCell);
  }

  getBookmark(): RowBookmark {
    return new RowBookmark(
      this.$anchorCell.pos,
      this.$headCell.pos,
      this.$index
    );
  }

  public static rowSelection(
    $anchorCell: ResolvedPos,
    $headCell: ResolvedPos = $anchorCell,
    $index: number = 0
  ): CellSelection {
    const table = $anchorCell.node(-1);
    const map = TableMap.get(table);
    const tableStart = $anchorCell.start(-1);

    const anchorRect = map.findCell($anchorCell.pos - tableStart);
    const headRect = map.findCell($headCell.pos - tableStart);
    const doc = $anchorCell.node(0);

    if (anchorRect.left <= headRect.left) {
      if (anchorRect.left > 0) {
        $anchorCell = doc.resolve(
          tableStart + map.map[anchorRect.top * map.width]
        );
      }
      if (headRect.right < map.width) {
        $headCell = doc.resolve(
          tableStart + map.map[map.width * (headRect.top + 1) - 1]
        );
      }
    } else {
      if (headRect.left > 0) {
        $headCell = doc.resolve(tableStart + map.map[headRect.top * map.width]);
      }
      if (anchorRect.right < map.width) {
        $anchorCell = doc.resolve(
          tableStart + map.map[map.width * (anchorRect.top + 1) - 1]
        );
      }
    }
    return new RowSelection($anchorCell, $headCell, $index);
  }
}

export class RowBookmark {
  constructor(
    public anchor: number,
    public head: number,
    public index: number = 0
  ) {}

  map(mapping: Mappable): RowBookmark {
    return new RowBookmark(
      mapping.map(this.anchor),
      mapping.map(this.head),
      this.index
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
      return new RowSelection($anchorCell, $headCell);
    } else {
      return Selection.near($headCell, 1);
    }
  }
}
