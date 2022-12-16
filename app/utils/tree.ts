import { flatten } from "lodash";

export const flattenTree = (root: any) => {
  const flattened: any[] = [];
  if (!root) {
    return flattened;
  }

  flattened.push(root);

  root.children.forEach((child: any) => {
    flattened.push(flattenTree(child));
  });

  return flatten(flattened);
};

export const ancestors = (node: any) => {
  const ancestors: any[] = [];
  while (node.parent !== null) {
    ancestors.unshift(node);
    node = node.parent;
  }
  return ancestors;
};
