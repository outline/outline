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
  const ancestors: NavigationNode[] = [];
  while (node !== null) {
    ancestors.unshift(node);
    node = node.parent as NavigationNode | null;
  }
  return ancestors;
};

export const descendants = (node: NavigationNode, depth = 0) => {
  const allDescendants = flattenTree(node).slice(1);
  return depth === 0
    ? allDescendants
    : allDescendants.filter(
        (d) => (d.depth as number) <= (node.depth as number) + depth
      );
};
