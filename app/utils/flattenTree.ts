import { flatten } from "lodash";

const flattenTree = (root: any) => {
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

export default flattenTree;
