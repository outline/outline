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

/**
 * Moves a node to a new position in a navigation tree. The index is the
 * position among the new siblings before the node is removed, as shown in
 * the tree.
 *
 * @param nodes The root nodes of the tree.
 * @param nodeId The id of the node to move.
 * @param parentId The id of the new parent node, or undefined for the root.
 * @param index The position among the new siblings, defaults to the end.
 * @returns the new root nodes, or undefined if the node or parent is not found.
 */
export const moveNavigationNode = (
  nodes: NavigationNode[],
  nodeId: string,
  parentId: string | undefined,
  index?: number
): NavigationNode[] | undefined => {
  let moved: NavigationNode | undefined;
  let fromParentId: string | undefined;
  let fromIndex = -1;

  const remove = (
    list: NavigationNode[],
    listParentId?: string
  ): NavigationNode[] => {
    const position = list.findIndex((node) => node.id === nodeId);
    if (position !== -1) {
      moved = list[position];
      fromParentId = listParentId;
      fromIndex = position;
      return list.filter((_, i) => i !== position);
    }
    return list.map((node) => {
      const children = remove(node.children ?? [], node.id);
      return children === node.children ? node : { ...node, children };
    });
  };

  const removed = remove(nodes);
  if (!moved) {
    return undefined;
  }
  const node = moved;

  const insert = (list: NavigationNode[]): NavigationNode[] => {
    let target = index ?? list.length;

    // Removing the node shifts the later siblings back by one.
    if (fromParentId === parentId && index !== undefined && fromIndex < index) {
      target -= 1;
    }
    return [...list.slice(0, target), node, ...list.slice(target)];
  };

  if (!parentId) {
    return insert(removed);
  }

  let found = false;
  const place = (list: NavigationNode[]): NavigationNode[] =>
    list.map((child) => {
      if (child.id === parentId) {
        found = true;
        return { ...child, children: insert(child.children ?? []) };
      }
      const children = place(child.children ?? []);
      return children === child.children ? child : { ...child, children };
    });

  const result = place(removed);
  return found ? result : undefined;
};

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
