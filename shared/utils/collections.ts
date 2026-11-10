import { NavigationNodeType, type NavigationNode } from "../types";
import shallowEqual from "./shallowEqual";
import naturalSort from "./naturalSort";

type Sort = {
  field: string;
  direction: "asc" | "desc";
};

/**
 * Returns whether the node is a link to an external location, rather than a
 * document.
 *
 * @param node The navigation node to check.
 * @returns true if the node is a link.
 */
export const isLinkNode = (node: Pick<NavigationNode, "type">): boolean =>
  node.type === NavigationNodeType.Link;

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
