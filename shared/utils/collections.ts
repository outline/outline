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
 * Inserts a node into a navigation tree.
 *
 * @param nodes The root nodes of the tree.
 * @param node The node to insert.
 * @param parentId The id of the parent node, or undefined for the root.
 * @param index The position among the siblings, defaults to the end.
 * @returns the new root nodes, or undefined if the parent is not found.
 */
export const insertNavigationNode = (
  nodes: NavigationNode[],
  node: NavigationNode,
  parentId: string | undefined,
  index?: number
): NavigationNode[] | undefined => {
  const insert = (list: NavigationNode[]): NavigationNode[] => {
    const target = index ?? list.length;
    return [...list.slice(0, target), node, ...list.slice(target)];
  };

  if (!parentId) {
    return insert(nodes);
  }

  let found = false;
  const place = (list: NavigationNode[]): NavigationNode[] =>
    list.map((child) => {
      if (child.id === parentId) {
        found = true;
        return { ...child, children: insert(child.children ?? []) };
      }
      const children = place(child.children ?? []);
      return shallowEqual(children, child.children ?? [])
        ? child
        : { ...child, children };
    });

  const result = place(nodes);
  return found ? result : undefined;
};

/**
 * Finds a node in a navigation tree.
 *
 * @param nodes The root nodes of the tree.
 * @param nodeId The id of the node to find.
 * @returns the node and the id of its parent, or undefined if not found.
 */
export const findNavigationNode = (
  nodes: NavigationNode[],
  nodeId: string
): { node: NavigationNode; parentId?: string } | undefined => {
  const search = (
    list: NavigationNode[],
    parentId?: string
  ): { node: NavigationNode; parentId?: string } | undefined => {
    for (const node of list) {
      if (node.id === nodeId) {
        return { node, parentId };
      }
      const result = search(node.children ?? [], node.id);
      if (result) {
        return result;
      }
    }
    return undefined;
  };

  return search(nodes);
};

/**
 * Replaces a node in a navigation tree. Unchanged subtrees keep their
 * reference.
 *
 * @param nodes The root nodes of the tree.
 * @param nodeId The id of the node to replace.
 * @param update Returns the replacement for the node.
 * @returns the new root nodes, or undefined if the node is not found.
 */
export const updateNavigationNode = (
  nodes: NavigationNode[],
  nodeId: string,
  update: (node: NavigationNode) => NavigationNode
): NavigationNode[] | undefined => {
  let found = false;
  const replace = (list: NavigationNode[]): NavigationNode[] =>
    list.map((node) => {
      if (node.id === nodeId) {
        found = true;
        return update(node);
      }
      const children = replace(node.children ?? []);
      return shallowEqual(children, node.children ?? [])
        ? node
        : { ...node, children };
    });

  const result = replace(nodes);
  return found ? result : undefined;
};

/**
 * Removes a node from a navigation tree. Unchanged subtrees keep their
 * reference.
 *
 * @param nodes The root nodes of the tree.
 * @param nodeId The id of the node to remove.
 * @returns the new root nodes, with the removed node, its parent id and its
 * position among its siblings, or undefined if the node is not found.
 */
export const removeNavigationNode = (
  nodes: NavigationNode[],
  nodeId: string
):
  | {
      nodes: NavigationNode[];
      node: NavigationNode;
      parentId?: string;
      index: number;
    }
  | undefined => {
  let removed:
    | { node: NavigationNode; parentId?: string; index: number }
    | undefined;

  const remove = (
    list: NavigationNode[],
    parentId?: string
  ): NavigationNode[] => {
    const index = list.findIndex((node) => node.id === nodeId);
    if (index !== -1) {
      removed = { node: list[index], parentId, index };
      return list.filter((_, i) => i !== index);
    }
    return list.map((node) => {
      const children = remove(node.children ?? [], node.id);
      return shallowEqual(children, node.children ?? [])
        ? node
        : { ...node, children };
    });
  };

  const result = remove(nodes);
  return removed ? { nodes: result, ...removed } : undefined;
};

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
  const removed = removeNavigationNode(nodes, nodeId);
  if (!removed) {
    return undefined;
  }

  // Removing the node shifts the later siblings back by one.
  const target =
    index !== undefined &&
    removed.parentId === parentId &&
    removed.index < index
      ? index - 1
      : index;
  return insertNavigationNode(removed.nodes, removed.node, parentId, target);
};

/**
 * Returns a copy of a navigation tree without the nodes that do not match.
 * Unchanged subtrees keep their reference.
 *
 * @param nodes The root nodes of the tree.
 * @param predicate Returns whether to keep a node and its descendants.
 * @returns the filtered root nodes.
 */
export const filterNavigationNodes = (
  nodes: NavigationNode[],
  predicate: (node: NavigationNode) => boolean
): NavigationNode[] => {
  const result = nodes.filter(predicate).map((node) => {
    const children = filterNavigationNodes(node.children ?? [], predicate);
    return shallowEqual(children, node.children ?? [])
      ? node
      : { ...node, children };
  });
  return shallowEqual(result, nodes) ? nodes : result;
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
