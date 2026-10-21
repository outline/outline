import type { NavigationNode } from "../types";
import {
  ancestors,
  descendants,
  flattenExpandedTree,
  flattenTree,
} from "./tree";

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

describe("#flattenExpandedTree", () => {
  // a
  // ├── b
  // │   ├── c
  // │   └── d
  // └── e
  // f
  const nodes = [
    buildNode("a", [
      buildNode("b", [buildNode("c"), buildNode("d")]),
      buildNode("e"),
    ]),
    buildNode("f"),
  ];

  const flatten = (
    expandedIds: string[],
    getChildren?: (node: NavigationNode) => NavigationNode[]
  ) =>
    flattenExpandedTree({
      nodes,
      depth: 2,
      parentId: "root",
      isExpanded: (id) => expandedIds.includes(id),
      getChildren,
    });

  it("should return only the root nodes when nothing is expanded", () => {
    const flattened = flatten([]);

    expect(flattened.map((item) => item.node.id)).toEqual(["a", "f"]);
    expect(flattened[0]).toMatchObject({
      depth: 2,
      index: 0,
      parentId: "root",
      hasChildren: true,
    });
    expect(flattened[1]).toMatchObject({ index: 1, hasChildren: false });
  });

  it("should include the children of expanded nodes in display order", () => {
    const flattened = flatten(["a", "b"]);

    expect(
      flattened.map((item) => [item.node.id, item.depth, item.parentId])
    ).toEqual([
      ["a", 2, "root"],
      ["b", 3, "a"],
      ["c", 4, "b"],
      ["d", 4, "b"],
      ["e", 3, "a"],
      ["f", 2, "root"],
    ]);
  });

  it("should skip the children of a collapsed node", () => {
    const flattened = flatten(["b"]);

    expect(flattened.map((item) => item.node.id)).toEqual(["a", "f"]);
  });

  it("should give the last child the ancestors that end with it", () => {
    const flattened = flatten(["a", "b"]);
    const trailing = Object.fromEntries(
      flattened.map((item) => [
        item.node.id,
        item.trailingAncestors.map((ancestor) => ancestor.node.id),
      ])
    );

    expect(trailing).toEqual({
      a: [],
      b: [],
      c: [],
      d: ["b"],
      e: ["a"],
      f: [],
    });
  });

  it("should use the children returned by getChildren", () => {
    const draft = buildNode("draft");
    const flattened = flatten(["f"], (node) =>
      node.id === "f" ? [draft] : node.children
    );

    expect(flattened.map((item) => item.node.id)).toEqual(["a", "f", "draft"]);
    expect(flattened[1].hasChildren).toBe(true);
  });
});
