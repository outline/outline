import type { NavigationNode } from "../types";
import { ancestors, descendants, flattenTree } from "./tree";

const buildNode = (
  id: string,
  children: NavigationNode[] = []
): NavigationNode => ({
  id,
  title: `Title ${id}`,
  url: `/doc/${id}`,
  children,
});

/**
 * Annotates a tree with the `parent` and `depth` fields added at runtime by
 * useCollectionTrees, mirroring how nodes are prepared in the app.
 */
const annotate = (
  node: NavigationNode,
  parent: NavigationNode | null = null,
  depth = 0
): NavigationNode => {
  node.parent = parent;
  node.depth = depth;
  node.children.forEach((child) => annotate(child, node, depth + 1));
  return node;
};

const buildTree = () =>
  buildNode("root", [
    buildNode("a", [buildNode("a1", [buildNode("a1i")]), buildNode("a2")]),
    buildNode("b"),
  ]);

describe("#flattenTree", () => {
  it("should return all nodes in depth-first order", () => {
    expect(flattenTree(buildTree()).map((node) => node.id)).toEqual([
      "root",
      "a",
      "a1",
      "a1i",
      "a2",
      "b",
    ]);
  });

  it("should return a single node for a leaf", () => {
    expect(flattenTree(buildNode("leaf")).map((node) => node.id)).toEqual([
      "leaf",
    ]);
  });

  it("should tolerate nodes without a children array", () => {
    const node: Partial<NavigationNode> = buildNode("orphan");
    delete node.children;

    expect(flattenTree(node as NavigationNode).map((n) => n.id)).toEqual([
      "orphan",
    ]);
  });
});

describe("#ancestors", () => {
  it("should return ancestors ordered from root to direct parent", () => {
    const root = annotate(buildTree());
    const deepest = root.children[0].children[0].children[0];

    expect(ancestors(deepest).map((node) => node.id)).toEqual([
      "root",
      "a",
      "a1",
    ]);
  });

  it("should return an empty list for a root node", () => {
    const root = annotate(buildTree());
    expect(ancestors(root)).toEqual([]);
  });

  it("should return an empty list for a missing node", () => {
    expect(ancestors(null)).toEqual([]);
  });

  it("should treat nodes without a parent annotation as roots", () => {
    // Nodes straight from the server, e.g. a shared tree, carry no parent.
    expect(ancestors(buildNode("unannotated"))).toEqual([]);
  });

  it("should not loop forever on a malformed parent cycle", () => {
    const first = buildNode("first");
    const second = buildNode("second");
    first.parent = second;
    second.parent = first;

    // The node itself is never part of its own ancestors, even when the
    // parent chain cycles back to it.
    expect(ancestors(first).map((node) => node.id)).toEqual(["second"]);
  });
});

describe("#descendants", () => {
  it("should return all descendants by default", () => {
    expect(descendants(buildTree()).map((node) => node.id)).toEqual([
      "a",
      "a1",
      "a1i",
      "a2",
      "b",
    ]);
  });

  it("should limit results to the given depth", () => {
    const root = buildTree();

    expect(descendants(root, 1).map((node) => node.id)).toEqual(["a", "b"]);
    expect(descendants(root, 2).map((node) => node.id)).toEqual([
      "a",
      "a1",
      "a2",
      "b",
    ]);
  });

  it("should limit by depth relative to the node itself", () => {
    const root = annotate(buildTree());
    const child = root.children[0];

    expect(descendants(child, 1).map((node) => node.id)).toEqual(["a1", "a2"]);
  });

  it("should not require depth annotations on nodes", () => {
    // Nodes straight from the server carry no depth annotation.
    expect(descendants(buildTree(), 1).map((node) => node.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("should return an empty list for a leaf node", () => {
    expect(descendants(buildNode("leaf"))).toEqual([]);
  });
});
