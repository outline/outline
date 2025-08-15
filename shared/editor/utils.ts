import filter from "lodash/filter";
import isNull from "lodash/isNull";
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

const joinMaybeClear = (
  tr: Transaction,
  $pos: ResolvedPos
): Transaction | null => {
  const before = $pos.nodeBefore,
    after = $pos.nodeAfter,
    index = $pos.index();
  if (!before || !after || !before.type.compatibleContent(after.type)) {
    return null;
  }
  if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
    return tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView();
  }
  if (
    !$pos.parent.canReplace(index, index + 1) ||
    !(after.isTextblock || canJoin(tr.doc, $pos.pos))
  ) {
    return null;
  }
  return tr.join($pos.pos).scrollIntoView();
};

const deleteBarrier = (
  tr: Transaction,
  $cut: ResolvedPos,
  dir: number
): Transaction | null => {
  const before = $cut.nodeBefore!,
    after = $cut.nodeAfter!;
  let conn, match;
  const isolated = before.type.spec.isolating || after.type.spec.isolating;
  if (!isolated) {
    const joinMaybeTr = joinMaybeClear(tr, $cut);
    if (joinMaybeTr) {
      return joinMaybeTr;
    }
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
    return tr.scrollIntoView();
  }

  const selAfter =
    after.type.spec.isolating || (dir > 0 && isolated)
      ? null
      : Selection.findFrom($cut, 1);
  const range = selAfter && selAfter.$from.blockRange(selAfter.$to),
    target = range && liftTarget(range);
  if (target !== null && target >= $cut.depth) {
    return tr.lift(range!, target).scrollIntoView();
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
      return tr.scrollIntoView();
    }
  }

  return null;
};

export const findCutAfter = ($pos: ResolvedPos) => {
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

export const atBlockEnd = (selection: Selection): ResolvedPos | null => {
  const { $cursor } = selection as TextSelection;
  if (!$cursor || $cursor.parentOffset < $cursor.parent.content.size) {
    return null;
  }
  return $cursor;
};

export const deleteSelectionTr = (tr: Transaction): Transaction => {
  if (tr.selection.empty) {
    return tr;
  }
  return tr.deleteSelection();
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
  const delBarrierTr = deleteBarrier(tr, $cut, 1);
  if (delBarrierTr) {
    return delBarrierTr;
  }

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
      return tr.scrollIntoView();
    }
  }

  // If the next node is an atom, delete it
  if (after.isAtom && $cut.depth === $cursor.depth - 1) {
    return tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView();
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
  return tr
    .setSelection(NodeSelection.create(tr.doc, $cut!.pos))
    .scrollIntoView();
};

export const wrapNodeAt = (
  pos: number,
  nodeType: NodeType,
  attrs: Attrs | null = null,
  tr: Transaction
): Transaction => {
  const $from = tr.doc.resolve(pos + 1);
  const $to = tr.doc.resolve($from.end());
  const range = $from.blockRange($to),
    wrapping = range && findWrapping(range, nodeType, attrs);
  if (!wrapping) {
    return tr;
  }
  return tr.wrap(range!, wrapping).scrollIntoView();
};

export const findCutBefore = ($pos: ResolvedPos): ResolvedPos | null => {
  if (!$pos.parent.type.spec.isolating) {
    for (let i = $pos.depth - 1; i >= 0; i--) {
      if ($pos.index(i) > 0) {
        return $pos.doc.resolve($pos.before(i + 1));
      }
      if ($pos.node(i).type.spec.isolating) {
        break;
      }
    }
  }
  return null;
};

export const selectNodeBackwardTr = (tr: Transaction): Transaction => {
  const { $head, empty } = tr.selection;
  let $cut: ResolvedPos | null = $head;
  if (!empty) {
    return tr;
  }

  if ($head.parent.isTextblock) {
    if ($head.parentOffset > 0) {
      return tr;
    }
    $cut = findCutBefore($head);
  }
  const node = $cut && $cut.nodeBefore;
  if (!node || !NodeSelection.isSelectable(node)) {
    return tr;
  }
  return tr
    .setSelection(NodeSelection.create(tr.doc, $cut!.pos - node.nodeSize))
    .scrollIntoView();
};

export const atBlockStart = (selection: Selection): ResolvedPos | null => {
  const { $cursor } = selection as TextSelection;
  if (!$cursor || $cursor.parentOffset > 0) {
    return null;
  }
  return $cursor;
};

export const joinBackwardTr = (tr: Transaction): Transaction => {
  const $cursor = atBlockStart(tr.selection);
  if (!$cursor) {
    return tr;
  }

  const $cut = findCutBefore($cursor);

  // If there is no node before this, try to lift
  if (!$cut) {
    const range = $cursor.blockRange(),
      target = range && liftTarget(range);
    if (target === null) {
      return tr;
    }
    return tr.lift(range!, target).scrollIntoView();
  }

  const before = $cut.nodeBefore!;
  // Apply the joining algorithm
  const delBarrierTr = deleteBarrier(tr, $cut, 1);
  if (delBarrierTr) {
    return delBarrierTr;
  }

  // If the node below has no content and the node above is
  // selectable, delete the node below and select the one above.
  if (
    $cursor.parent.content.size === 0 &&
    (textblockAt(before, "end") || NodeSelection.isSelectable(before))
  ) {
    for (let depth = $cursor.depth; ; depth--) {
      const delStep = replaceStep(
        tr.doc,
        $cursor.before(depth),
        $cursor.after(depth),
        Slice.empty
      );
      if (
        delStep &&
        (delStep as ReplaceStep).slice.size <
          (delStep as ReplaceStep).to - (delStep as ReplaceStep).from
      ) {
        tr = tr.step(delStep);
        tr.setSelection(
          textblockAt(before, "end")
            ? Selection.findFrom(
                tr.doc.resolve(tr.mapping.map($cut.pos, -1)),
                -1
              )!
            : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize)
        );
        return tr.scrollIntoView();
      }
      if (depth === 1 || $cursor.node(depth - 1).childCount > 1) {
        break;
      }
    }
  }

  // If the node before is an atom, delete it
  if (before.isAtom && $cut.depth === $cursor.depth - 1) {
    return tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView();
  }

  return tr;
};

export const ancestors = (
  $from: ResolvedPos,
  pred?: (ancestor: Node, index?: number, arr?: Node[]) => boolean
) => {
  const ancestorArray: Node[] = [];

  // Notice that ancestors are arranged in increasing order of depth
  // within the array, which implies that the index of an ancestor
  // within the array actually represents its depth within the document.
  for (let d = 0; d <= $from.depth; d++) {
    ancestorArray.push($from.node(d));
  }

  if (pred) {
    return filter(ancestorArray, (ancestor, index, ancestorArray) =>
      pred(ancestor, index, ancestorArray as Node[])
    );
  }

  return ancestorArray;
};

// Few words of caution here––the following `nearest` and `furthest`
// functions are defined as standalone utils but are actually
// coupled with the `ancestors` function above, semantically.
// Therefore, these are expected to be used only in conjunction
// with the `ancestors` function.
export const nearest = (ancestors: Node[]) =>
  // Since the ancestors are arranged in increasing order of depth,
  // the last element of the array is the nearest ancestor.
  ancestors.pop();

export const furthest = (ancestors: Node[]) => ancestors.shift();

export const height = (node: Node) => {
  if (node.isLeaf) {
    return 0;
  }

  let h = 0;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    h = Math.max(h, height(child));
  }

  return 1 + h;
};

export const prevSibling = ($from: ResolvedPos, depth?: number) => {
  const ancestor = $from.node(depth);
  const index = $from.index(depth);
  if (index === 0) {
    return null;
  }
  return ancestor.child(index - 1);
};

export const liftChildrenOfNodeAt = (
  pos: number,
  tr: Transaction
): Transaction => {
  const node = tr.doc.nodeAt(pos);
  const start = pos + 1;
  const end = start + node!.content.size;
  const $start = tr.doc.resolve(start);
  const $end = tr.doc.resolve(end);
  const range = $start.blockRange($end);
  if (isNull(range)) {
    return tr;
  }
  const target = liftTarget(range);
  if (isNull(target)) {
    return tr;
  }

  return tr.lift(range, target);
};
