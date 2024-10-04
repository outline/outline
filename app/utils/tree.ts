import { NavigationNode } from "@shared/types";

export const flattenTree = (root: NavigationNode) => {
  const flattened: NavigationNode[] = [];
  if (!root) {
    return flattened;
  }

  flattened.push(root);

  root.children.forEach((child) => {
    flattened.push(...flattenTree(child));
  });

  return flattened;
};

export const ancestors = (node: NavigationNode | null) => {
  const nodes: NavigationNode[] = [];
  if (node) {
    while (node.parent !== null) {
      nodes.unshift(node.parent as NavigationNode);
      node = node.parent as NavigationNode;
    }
  }
  return nodes;
};

export const descendants = (node: NavigationNode, depth = 0) => {
  const allDescendants = flattenTree(node).slice(1);
  return depth === 0
    ? allDescendants
    : allDescendants.filter(
        (d) => (d.depth as number) <= (node.depth as number) + depth
      );
};
