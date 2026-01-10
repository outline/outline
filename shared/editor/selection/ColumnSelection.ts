import type { ResolvedPos } from "prosemirror-model";
import { type Node } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { CellSelection, inSameTable, TableMap } from "prosemirror-tables";
import type { Mappable } from "prosemirror-transform";

export class ColumnSelection extends CellSelection {
  getBookmark(): ColumnBookmark {
    return new ColumnBookmark(this.$anchorCell.pos, this.$headCell.pos);
  }

  public static colSelection(
    $anchorCell: ResolvedPos,
    $headCell: ResolvedPos = $anchorCell
  ): CellSelection {
    const table = $anchorCell.node(-1);
    const map = TableMap.get(table);
    const tableStart = $anchorCell.start(-1);

    const anchorRect = map.findCell($anchorCell.pos - tableStart);
    const headRect = map.findCell($headCell.pos - tableStart);
    const doc = $anchorCell.node(0);

    if (anchorRect.top <= headRect.top) {
      if (anchorRect.top > 0) {
        $anchorCell = doc.resolve(tableStart + map.map[anchorRect.left]);
      }
      if (headRect.bottom < map.height) {
        $headCell = doc.resolve(
          tableStart +
            map.map[map.width * (map.height - 1) + headRect.right - 1]
        );
      }
    } else {
      if (headRect.top > 0) {
        $headCell = doc.resolve(tableStart + map.map[headRect.left]);
      }
      if (anchorRect.bottom < map.height) {
        $anchorCell = doc.resolve(
          tableStart +
            map.map[map.width * (map.height - 1) + anchorRect.right - 1]
        );
      }
    }
    return new ColumnSelection($anchorCell, $headCell);
  }
}

export class ColumnBookmark {
  constructor(
    public anchor: number,
    public head: number
  ) {}

  map(mapping: Mappable): ColumnBookmark {
    return new ColumnBookmark(mapping.map(this.anchor), mapping.map(this.head));
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
      return new ColumnSelection($anchorCell, $headCell);
    } else {
      return Selection.near($headCell, 1);
    }
  }
}
