import {
  Node,
  NodeType,
  ResolvedPos,
  Slice,
  Fragment,
  Attrs,
} from "prosemirror-model";
import {
  NodeSelection,
  Selection,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import {
  canJoin,
  findWrapping,
  liftTarget,
  ReplaceAroundStep,
  replaceStep,
  ReplaceStep,
} from "prosemirror-transform";

const textblockAt = (node: Node, side: "start" | "end", only = false) => {
  for (
    let scan: Node | null = node;
    scan;
    scan = side === "start" ? scan.firstChild : scan.lastChild
  ) {
    if (scan.isTextblock) {
      return true;
    }
    if (only && scan.childCount !== 1) {
      return false;
    }
  }
  return false;
};

const joinMaybeClear = (tr: Transaction, $pos: ResolvedPos): Transaction => {
  const before = $pos.nodeBefore,
    after = $pos.nodeAfter,
    index = $pos.index();
  if (!before || !after || !before.type.compatibleContent(after.type)) {
    return tr;
  }
  if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
    tr = tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView();
    return tr;
  }
  if (
    !$pos.parent.canReplace(index, index + 1) ||
    !(after.isTextblock || canJoin(tr.doc, $pos.pos))
  ) {
    return tr;
  }
  tr = tr.join($pos.pos).scrollIntoView();
  return tr;
};

const deleteBarrier = (
  tr: Transaction,
  $cut: ResolvedPos,
  dir: number
): Transaction => {
  const before = $cut.nodeBefore!,
    after = $cut.nodeAfter!;
  let conn, match;
  const isolated = before.type.spec.isolating || after.type.spec.isolating;
  if (!isolated) {
    return joinMaybeClear(tr, $cut);
  }

  const canDelAfter =
    !isolated && $cut.parent.canReplace($cut.index(), $cut.index() + 1);
  if (
    canDelAfter &&
    (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(
      after.type
    )) &&
    match.matchType(conn[0] || after.type)!.validEnd
  ) {
    const end = $cut.pos + after.nodeSize;
    let wrap = Fragment.empty;
    for (let i = conn.length - 1; i >= 0; i--) {
      wrap = Fragment.from(conn[i].create(null, wrap));
    }

    wrap = Fragment.from(before.copy(wrap));
    tr = tr.step(
      new ReplaceAroundStep(
        $cut.pos - 1,
        end,
        $cut.pos,
        end,
        new Slice(wrap, 1, 0),
        conn.length,
        true
      )
    );
    const $joinAt = tr.doc.resolve(end + 2 * conn.length);
    if (
      $joinAt.nodeAfter &&
      $joinAt.nodeAfter.type === before.type &&
      canJoin(tr.doc, $joinAt.pos)
    ) {
      tr = tr.join($joinAt.pos);
    }
    tr = tr.scrollIntoView();
    return tr;
  }

  const selAfter =
    after.type.spec.isolating || (dir > 0 && isolated)
      ? null
      : Selection.findFrom($cut, 1);
  const range = selAfter && selAfter.$from.blockRange(selAfter.$to),
    target = range && liftTarget(range);
  if (target !== null && target >= $cut.depth) {
    tr = tr.lift(range!, target).scrollIntoView();
    return tr;
  }

  if (
    canDelAfter &&
    textblockAt(after, "start", true) &&
    textblockAt(before, "end")
  ) {
    let at = before;
    const wrap = [];
    for (;;) {
      wrap.push(at);
      if (at.isTextblock) {
        break;
      }
      at = at.lastChild!;
    }
    let afterText = after,
      afterDepth = 1;
    for (; !afterText.isTextblock; afterText = afterText.firstChild!) {
      afterDepth++;
    }

    if (at.canReplace(at.childCount, at.childCount, afterText.content)) {
      let end = Fragment.empty;
      for (let i = wrap.length - 1; i >= 0; i--) {
        end = Fragment.from(wrap[i].copy(end));
      }

      tr = tr.step(
        new ReplaceAroundStep(
          $cut.pos - wrap.length,
          $cut.pos + after.nodeSize,
          $cut.pos + afterDepth,
          $cut.pos + after.nodeSize - afterDepth,
          new Slice(end, wrap.length, 0),
          0,
          true
        )
      );
      tr = tr.scrollIntoView();
      return tr;
    }
  }

  return tr;
};

const findCutAfter = ($pos: ResolvedPos) => {
  if (!$pos.parent.type.spec.isolating) {
    for (let i = $pos.depth - 1; i >= 0; i--) {
      const parent = $pos.node(i);
      if ($pos.index(i) + 1 < parent.childCount) {
        return $pos.doc.resolve($pos.after(i + 1));
      }
      if (parent.type.spec.isolating) {
        break;
      }
    }
  }
  return null;
};

const joinTextblocksAround = (
  tr: Transaction,
  $cut: ResolvedPos
): Transaction => {
  const before = $cut.nodeBefore!;
  let beforeText = before;
  let beforePos = $cut.pos - 1;
  for (; !beforeText.isTextblock; beforePos--) {
    if (beforeText.type.spec.isolating) {
      return tr;
    }
    const child = beforeText.lastChild;
    if (!child) {
      return tr;
    }
    beforeText = child;
  }
  const after = $cut.nodeAfter!;
  let afterText = after;
  let afterPos = $cut.pos + 1;
  for (; !afterText.isTextblock; afterPos++) {
    if (afterText.type.spec.isolating) {
      return tr;
    }
    const child = afterText.firstChild;
    if (!child) {
      return tr;
    }
    afterText = child;
  }
  const step = replaceStep(
    tr.doc,
    beforePos,
    afterPos,
    Slice.empty
  ) as ReplaceStep | null;
  if (
    !step ||
    step.from !== beforePos ||
    (step instanceof ReplaceStep && step.slice.size >= afterPos - beforePos)
  ) {
    return tr;
  }
  tr = tr.step(step);
  tr = tr.setSelection(TextSelection.create(tr.doc, beforePos));
  tr = tr.scrollIntoView();
  return tr;
};

export const atBlockEnd = (selection: Selection): ResolvedPos | null => {
  const { $cursor } = selection as TextSelection;
  if (!$cursor || $cursor.parentOffset < $cursor.parent.content.size) {
    return null;
  }
  return $cursor;
};

export const deleteSelectionTr = (tr: Transaction): Transaction => {
  if (!tr.selection.empty) {
    tr = tr.deleteSelection();
  }
  return tr;
};

export const joinForwardTr = (tr: Transaction): Transaction => {
  const $cursor = atBlockEnd(tr.selection);
  if (!$cursor) {
    return tr;
  }

  const $cut = findCutAfter($cursor);
  // If there is no node after this, there's nothing to do
  if (!$cut) {
    return tr;
  }

  const after = $cut.nodeAfter!;
  // Try the joining algorithm
  tr = deleteBarrier(tr, $cut, 1);

  // If the node above has no content and the node below is
  // selectable, delete the node above and select the one below.
  if (
    $cursor.parent.content.size === 0 &&
    (textblockAt(after, "start") || NodeSelection.isSelectable(after))
  ) {
    const delStep = replaceStep(
      tr.doc,
      $cursor.before(),
      $cursor.after(),
      Slice.empty
    );
    if (
      delStep &&
      (delStep as ReplaceStep).slice.size <
        (delStep as ReplaceStep).to - (delStep as ReplaceStep).from
    ) {
      tr = tr.step(delStep);
      tr = tr.setSelection(
        textblockAt(after, "start")
          ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos)), 1)!
          : NodeSelection.create(tr.doc, tr.mapping.map($cut.pos))
      );
      tr = tr.scrollIntoView();
    }
  }

  // If the next node is an atom, delete it
  if (after.isAtom && $cut.depth === $cursor.depth - 1) {
    tr = tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView();
  }

  return tr;
};

export const selectNodeForwardTr = (tr: Transaction): Transaction => {
  const { $head, empty } = tr.selection;
  let $cut: ResolvedPos | null = $head;
  if (!empty) {
    return tr;
  }
  if ($head.parent.isTextblock) {
    if ($head.parentOffset < $head.parent.content.size) {
      return tr;
    }
    $cut = findCutAfter($head);
  }
  const node = $cut && $cut.nodeAfter;
  if (!node || !NodeSelection.isSelectable(node)) {
    return tr;
  }
  tr = tr
    .setSelection(NodeSelection.create(tr.doc, $cut!.pos))
    .scrollIntoView();
  return tr;
};

export function wrapNodeInAt(
  pos: number,
  nodeType: NodeType,
  attrs: Attrs | null = null,
  tr: Transaction
): Transaction {
  const $from = tr.doc.resolve(pos + 1);
  const $to = tr.doc.resolve($from.end());
  const range = $from.blockRange($to),
    wrapping = range && findWrapping(range, nodeType, attrs);
  if (!wrapping) {
    return tr;
  }
  tr = tr.wrap(range!, wrapping).scrollIntoView();
  return tr;
}

export const joinTextblockForwardTr = (tr: Transaction): Transaction => {
  const $cursor = atBlockEnd(tr.selection);
  if (!$cursor) {
    return tr;
  }
  const $cut = findCutAfter($cursor);
  return $cut ? joinTextblocksAround(tr, $cut) : tr;
};
