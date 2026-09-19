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
