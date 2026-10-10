import type { NavigationNode } from "../types";

/**
 * Flattens a navigation tree into a list of nodes in depth-first order,
 * starting with the root node itself.
 *
 * @param root The root node of the tree to flatten.
 * @returns the root node followed by all of its descendants, or an empty
 *   list when no root is given.
 */
export const flattenTree = (
  root: NavigationNode | null | undefined
): NavigationNode[] => {
  const flattened: NavigationNode[] = [];

  const visit = (node: NavigationNode) => {
    flattened.push(node);
    node.children?.forEach(visit);
  };

  if (root) {
    visit(root);
  }

  return flattened;
};

/**
 * Returns the ancestors of a node, ordered from the root of the tree down to
 * the node's direct parent. Nodes must have been annotated with a `parent`
 * reference (see useCollectionTrees); nodes without one are treated as roots.
 *
 * @param node The node to return ancestors for.
 * @returns the node's ancestors, or an empty list for a root node.
 */
export const ancestors = (
  node: NavigationNode | null | undefined
): NavigationNode[] => {
  const nodes: NavigationNode[] = [];
  const seen = new Set<NavigationNode>();
  if (node) {
    seen.add(node);
  }

  let current = node?.parent;
  while (current && !seen.has(current)) {
    seen.add(current);
    nodes.unshift(current);
    current = current.parent;
  }

  return nodes;
};

/**
 * Returns the descendants of a node in depth-first order, optionally limited
 * to a maximum depth below the node.
 *
 * @param node The node to return descendants for.
 * @param depth The maximum depth to descend to, where 1 returns direct
 *   children only. Defaults to 0, which returns all descendants.
 * @returns the node's descendants, not including the node itself.
 */
export const descendants = (
  node: NavigationNode,
  depth = 0
): NavigationNode[] => {
  const found: NavigationNode[] = [];

  const visit = (child: NavigationNode, childDepth: number) => {
    if (depth > 0 && childDepth > depth) {
      return;
    }
    found.push(child);
    child.children?.forEach((grandchild) => visit(grandchild, childDepth + 1));
  };

  node.children?.forEach((child) => visit(child, 1));

  return found;
};

/** A node of a flattened tree, with its position in the tree. */
export interface FlattenedTreeNode {
  /** The node itself. */
  node: NavigationNode;
  /** Depth of the node in the tree. */
  depth: number;
  /** Index of the node among its siblings. */
  index: number;
  /** Id of the parent node, if any. */
  parentId?: string;
  /** Whether the node has children. */
  hasChildren: boolean;
  /**
   * Ancestors whose subtree ends with the subtree of this node, nearest first.
   * Empty unless the node is the last child of its parent.
   */
  trailingAncestors: FlattenedTreeNode[];
}

/**
 * Flattens the expanded part of a navigation tree into a list of nodes in
 * display order. The children of a node are included only when it is expanded.
 *
 * @param options.nodes The nodes at the root of the tree.
 * @param options.isExpanded Returns whether the node with the given id is expanded.
 * @param options.getChildren Returns the children to show for a node, defaults
 *   to the children of the node.
 * @param options.depth Depth of the root nodes, defaults to 0.
 * @param options.parentId Id of the node that contains the root nodes, if any.
 * @returns the visible nodes in display order.
 */
export const flattenExpandedTree = ({
  nodes,
  isExpanded,
  getChildren = (node) => node.children,
  depth = 0,
  parentId,
}: {
  nodes: NavigationNode[];
  isExpanded: (nodeId: string) => boolean;
  getChildren?: (node: NavigationNode) => NavigationNode[];
  depth?: number;
  parentId?: string;
}): FlattenedTreeNode[] => {
  const flattened: FlattenedTreeNode[] = [];

  const visit = (
    siblings: NavigationNode[],
    siblingDepth: number,
    parent: FlattenedTreeNode | undefined
  ) => {
    siblings.forEach((node, index) => {
      const children = getChildren(node);
      const item: FlattenedTreeNode = {
        node,
        depth: siblingDepth,
        index,
        parentId: parent ? parent.node.id : parentId,
        hasChildren: children.length > 0,
        trailingAncestors:
          parent && index === siblings.length - 1
            ? [parent, ...parent.trailingAncestors]
            : [],
      };
      flattened.push(item);

      if (children.length && isExpanded(node.id)) {
        visit(children, siblingDepth + 1, item);
      }
    });
  };

  visit(nodes, depth, undefined);
  return flattened;
};
