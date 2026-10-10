import type { Range } from "@tanstack/react-virtual";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { noop } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import type { NavigationNode } from "@shared/types";
import { sortNavigationNodes } from "@shared/utils/collections";
import { flattenExpandedTree } from "@shared/utils/tree";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type GroupMembership from "~/models/GroupMembership";
import type UserMembership from "~/models/UserMembership";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import { useComputed } from "~/hooks/useComputed";
import useStores from "~/hooks/useStores";
import { useScrollMargin } from "../hooks/useScrollMargin";
import DocumentLink from "./DocumentLink";
import { useDraggedItemId, useSidebarScrollElement } from "./DragActiveContext";
import { useSidebarContext } from "./SidebarContext";
import { useSidebarExpansion } from "./SidebarExpansionContext";

// Approximate rendered row height, rows are measured once mounted.
const ROW_HEIGHT = 30;

// Mount rows just outside the visible area so that scrolling stays smooth.
const OVERSCAN = 10;

const estimateSize = () => ROW_HEIGHT;

const noAdjustment = () => false;

interface Props {
  /** The documents at the root of the tree. */
  nodes: NavigationNode[];
  /** Indentation depth of the root documents. */
  depth: number;
  /** Id of the document that contains the root documents, if any. */
  parentId?: string;
  /** The collection that the documents belong to, if loaded. */
  collection?: Collection;
  /** The membership that grants access to the documents, if any. */
  membership?: UserMembership | GroupMembership;
  /** Function to prefetch a document by ID. */
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
}

/**
 * Renders the expanded part of a sidebar document tree as a flat list, and
 * mounts only the rows that are near the visible area of the sidebar.
 */
export const DocumentTree = observer(function DocumentTree({
  nodes,
  depth,
  parentId,
  collection,
  membership,
  prefetchDocument,
}: Props) {
  const { documents } = useStores();
  const expansion = useSidebarExpansion();
  const sidebarContext = useSidebarContext();
  const activeSidebarContext = useActiveSidebarContext();
  const scrollElement = useSidebarScrollElement();
  const draggedItemId = useDraggedItemId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollMargin = useScrollMargin(containerRef, scrollElement);
  const activeDocument = documents.active;

  const rows = useComputed(
    () =>
      flattenExpandedTree({
        nodes,
        depth,
        parentId,
        isExpanded: (nodeId) => expansion.isExpanded(nodeId),
        getChildren: (node) => {
          // Show an unpublished draft below its parent while it is open.
          const active = documents.active;
          if (
            collection &&
            active?.isDraft &&
            active.isActive &&
            active.parentDocumentId === node.id
          ) {
            return sortNavigationNodes(
              [active.asNavigationNode, ...node.children],
              collection.sort,
              false
            );
          }
          return node.children;
        },
      }),
    [nodes, depth, parentId, collection, expansion, documents]
  );

  const activeIndex = React.useMemo(
    () => rows.findIndex((row) => row.node.id === activeDocument?.id),
    [rows, activeDocument?.id]
  );
  const draggedIndex = React.useMemo(
    () => rows.findIndex((row) => row.node.id === draggedItemId),
    [rows, draggedItemId]
  );

  // Keep the active row mounted so that it can scroll into view, and the
  // dragged row so that the drag does not end when it scrolls away.
  const rangeExtractor = React.useCallback(
    (range: Range) => {
      const indexes = new Set(defaultRangeExtractor(range));
      for (const index of [activeIndex, draggedIndex]) {
        if (index !== -1) {
          indexes.add(index);
        }
      }
      return [...indexes].sort((a, b) => a - b);
    },
    [activeIndex, draggedIndex]
  );

  const getScrollElement = React.useCallback(
    () => scrollElement,
    [scrollElement]
  );
  const getScrollOffset = React.useCallback(
    () => scrollElement?.scrollTop ?? 0,
    [scrollElement]
  );
  const getItemKey = React.useCallback(
    (index: number) => rows[index].node.id,
    [rows]
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement,
    getItemKey,
    estimateSize,
    overscan: OVERSCAN,
    scrollMargin,
    rangeExtractor,
    // The virtualizer only learns the offset from scroll events, and scrolls
    // to its initial offset when it mounts. Start from the current position
    // and never scroll, as the browser and scrollIntoView own the position.
    initialOffset: getScrollOffset,
    scrollToFn: noop,
  });

  // Rows stay in the normal flow, so the browser's scroll anchoring already
  // compensates when a row above the visible area changes size.
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = noAdjustment;

  const virtualItems = virtualizer.getVirtualItems();
  // The virtualizer renders no rows until it has measured the scroll element,
  // so the active row can appear a render after the tree mounts.
  const isActiveRowRendered = virtualItems.some(
    (item) => item.index === activeIndex
  );
  const activeNodeId =
    activeIndex === -1 ? undefined : rows[activeIndex].node.id;
  const activeHasChildren =
    activeIndex !== -1 && rows[activeIndex].node.children.length > 0;
  const activeParentId = activeDocument?.parentDocumentId;

  // Only scroll the tree that matches the navigation context so a document
  // rendered in multiple contexts (collections/starred/shared) doesn't jump to
  // an unexpected section; when no context is set, fall back to the collections
  // tree alone.
  const isScrollContext =
    activeSidebarContext === sidebarContext ||
    (!activeSidebarContext && sidebarContext === "collections");

  React.useLayoutEffect(() => {
    const element = containerRef.current?.querySelector(
      `[data-index="${activeIndex}"]`
    );
    if (isActiveRowRendered && isScrollContext && element) {
      scrollIntoView(element, {
        scrollMode: "if-needed",
        behavior: "auto",
        boundary: (parent) => parent.id !== "sidebar",
      });
    }
    // Scroll when the active row appears, not when rows above it change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNodeId, isActiveRowRendered, isScrollContext]);

  React.useEffect(() => {
    if (
      activeNodeId &&
      (activeHasChildren || sidebarContext !== "collections")
    ) {
      void documents.fetchChildDocuments(activeNodeId);
    }
  }, [documents, activeNodeId, activeHasChildren, sidebarContext]);

  // Collapse documents that no longer have children, so that they do not show
  // as expanded when a child is added again.
  React.useEffect(() => {
    for (const row of rows) {
      if (
        !row.node.children.length &&
        row.node.id !== activeParentId &&
        expansion.isExpanded(row.node.id)
      ) {
        expansion.collapse(row.node.id);
      }
    }
  }, [rows, expansion, activeParentId]);

  // Rows outside of the rendered range are replaced by spacers of the same
  // height, so that the rows keep their place in the normal document flow.
  let offset = 0;
  const items = virtualItems.map((item) => {
    const row = rows[item.index];
    const start = item.start - virtualizer.options.scrollMargin;
    const gap = start - offset;
    offset = start + item.size;

    return (
      <React.Fragment key={item.key}>
        {gap > 0 && <div style={{ height: gap }} />}
        <div data-index={item.index} ref={virtualizer.measureElement}>
          <DocumentLink
            node={row.node}
            collection={collection}
            membership={membership}
            prefetchDocument={prefetchDocument}
            isDraft={row.node.isDraft}
            depth={row.depth}
            index={row.index}
            parentId={row.parentId}
            hasChildren={row.hasChildren}
            trailingAncestors={row.trailingAncestors}
          />
        </div>
      </React.Fragment>
    );
  });
  const remainder = virtualizer.getTotalSize() - offset;

  // The container stays mounted while the tree is empty, so that its scroll
  // margin is already tracked when the first rows are added.
  return (
    <div ref={containerRef}>
      {items}
      {remainder > 0 && <div style={{ height: remainder }} />}
    </div>
  );
});
