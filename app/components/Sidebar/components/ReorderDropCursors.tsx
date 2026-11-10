import { observer } from "mobx-react";
import * as React from "react";
import { DocumentPermission, type NavigationNode } from "@shared/types";
import type { FlattenedTreeNode } from "@shared/utils/tree";
import type Collection from "~/models/Collection";
import type GroupMembership from "~/models/GroupMembership";
import type UserMembership from "~/models/UserMembership";
import { useDropToReorderDocument } from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import { childDepthFor, indentForDepth } from "./SidebarLink";

interface Options {
  /** The node of the row. */
  node: NavigationNode;
  /** The collection that contains the row, if loaded. */
  collection?: Collection;
  /** The id of the collection to move into, when the collection is not loaded. */
  collectionId?: string | null;
  /** The membership that grants access to the row, if any. */
  membership?: UserMembership | GroupMembership;
  /** Indentation depth of the row. */
  depth: number;
  /** Position of the row among its siblings. */
  index: number;
  /** Id of the parent document of the row, if any. */
  parentId?: string;
  /** Whether the row is expanded. */
  expanded: boolean;
  /** Whether the row has children. */
  hasChildren: boolean;
  /** Whether the row is being dragged. */
  isDragging: boolean;
  /** Ancestors whose subtree ends with this row, nearest first. */
  trailingAncestors: FlattenedTreeNode[];
}

/**
 * Returns the drop cursors to render above and below a sidebar tree row, so
 * that dragged documents and links can be placed around it.
 *
 * @param options The position and state of the row.
 * @returns the cursors before and after the row.
 */
export function useReorderDropCursors({
  node,
  collection,
  collectionId,
  membership,
  depth,
  index,
  parentId,
  expanded,
  hasChildren,
  isDragging,
  trailingAncestors,
}: Options) {
  const moveCollectionId = collection?.id ?? collectionId;

  const targetAbove = React.useMemo<DropTarget>(
    () => ({ parentDocumentId: parentId, index, depth }),
    [parentId, index, depth]
  );

  // Below an expanded node the only position is its first child. Otherwise the
  // position after the node comes first, then any ancestor positions that end
  // here, so the pointer's horizontal position picks the depth. The node being
  // dragged skips the position after itself, which would be a no-op.
  const targetsBelow = React.useMemo<DropTarget[]>(() => {
    if (expanded && hasChildren) {
      return [
        { parentDocumentId: node.id, index: 0, depth: childDepthFor(depth) },
      ];
    }
    const afterSelf = isDragging
      ? []
      : [{ parentDocumentId: parentId, index: index + 1, depth }];
    const afterAncestors = trailingAncestors.map((ancestor) => ({
      parentDocumentId: ancestor.parentId,
      index: ancestor.index + 1,
      depth: ancestor.depth,
    }));
    return [...afterSelf, ...afterAncestors];
  }, [
    expanded,
    hasChildren,
    isDragging,
    node.id,
    parentId,
    index,
    depth,
    trailingAncestors,
  ]);

  // Without a collection we can't read isManualSort; fall back to the shared
  // membership's permission, which is the same for every descendant.
  const canReorderHere = collection
    ? collection.isManualSort
    : membership?.permission === DocumentPermission.Admin ||
      membership?.permission === DocumentPermission.ReadWrite;

  // Cursors stay mounted between drags so that drag start/end doesn't change
  // the tree for every row.
  const cursorBefore =
    canReorderHere && index === 0 ? (
      <ReorderDropCursor
        node={node}
        collection={collection}
        collectionId={moveCollectionId}
        target={targetAbove}
        position="top"
      />
    ) : undefined;

  // Later cursors render on top, so each outer level's narrower hit area wins
  // when the pointer is left of the previous level's indent.
  const cursorAfter = canReorderHere
    ? targetsBelow.map((target, level) => (
        <ReorderDropCursor
          key={level}
          node={node}
          collection={collection}
          collectionId={moveCollectionId}
          target={target}
          hitWidth={
            level > 0
              ? indentForDepth(targetsBelow[level - 1].depth)
              : undefined
          }
        />
      ))
    : undefined;

  return { cursorBefore, cursorAfter };
}

/** A position in the document tree that a dragged item can be dropped at. */
interface DropTarget {
  parentDocumentId: string | undefined;
  index: number;
  depth: number;
}

interface ReorderDropCursorProps {
  node: NavigationNode;
  collection?: Collection;
  collectionId?: string | null;
  target: DropTarget;
  position?: "top";
  hitWidth?: number;
}

const ReorderDropCursor = observer(function ReorderDropCursor({
  node,
  collection,
  collectionId,
  target,
  position,
  hitWidth,
}: ReorderDropCursorProps) {
  const [{ isOverReorder }, dropToReorder] = useDropToReorderDocument(
    node,
    collection,
    (item) => {
      if (!collectionId) {
        return;
      }
      return {
        documentId: item.id,
        collectionId,
        parentDocumentId: target.parentDocumentId,
        index: target.index,
      };
    }
  );

  return (
    <DropCursor
      isActiveDrop={isOverReorder}
      innerRef={dropToReorder}
      position={position}
      indent={indentForDepth(target.depth)}
      hitWidth={hitWidth}
    />
  );
});
