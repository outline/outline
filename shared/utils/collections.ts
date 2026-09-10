import type { NavigationNode } from "../types";
import shallowEqual from "./shallowEqual";
import naturalSort from "./naturalSort";

type Sort = {
  field: string;
  direction: "asc" | "desc";
};

/**
 * Adjusts a target position to account for the moved document vacating its original slot, which
 * shifts every later sibling up by one. Only applies when the document stays amongst the same
 * siblings, as otherwise it never occupied a slot in the destination.
 *
 * @param index the target position, relative to a list still containing the document.
 * @param fromIndex the position the document currently occupies.
 * @param isSameParent whether the document is staying under the same parent.
 * @returns the resulting position.
 */
export const adjustIndexForMove = (
  index: number,
  fromIndex: number,
  isSameParent: boolean
): number => (isSameParent && fromIndex < index ? index - 1 : index);

export const sortNavigationNodes = (
  nodes: NavigationNode[],
  sort: Sort,
  sortChildren = true
): NavigationNode[] => {
  // "index" field is manually sorted and is represented by the documentStructure
  // already saved in the database, no further sort is needed
  if (sort.field === "index") {
    return nodes;
  }

  const orderedDocs = naturalSort(nodes, sort.field, {
    direction: sort.direction,
  });

  if (!sortChildren) {
    return orderedDocs;
  }

  return orderedDocs.map((node) => {
    const sortedChildren = sortNavigationNodes(
      node.children,
      sort,
      sortChildren
    );
    // Preserve the original node reference if children order didn't change.
    // This allows React.memo to skip re-renders of unchanged tree nodes.
    if (shallowEqual(sortedChildren, node.children)) {
      return node;
    }
    return { ...node, children: sortedChildren };
  });
};
