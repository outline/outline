import { NavigationNodeType, type NavigationNode } from "../types";
import {
  filterNavigationNodes,
  findNavigationNode,
  insertNavigationNode,
  isLinkNode,
  moveNavigationNode,
  removeNavigationNode,
  updateNavigationNode,
} from "./collections";

const node = (id: string, children: NavigationNode[] = []): NavigationNode => ({
  id,
  title: id,
  url: `/doc/${id}`,
  children,
});

const link = (id: string): NavigationNode => ({
  ...node(id),
  type: NavigationNodeType.Link,
  url: "https://example.com",
});

const ids = (nodes: NavigationNode[] | undefined): unknown =>
  nodes?.map((n) => (n.children.length ? [n.id, ids(n.children)] : n.id));

describe("moveNavigationNode", () => {
  const tree = [node("a", [node("a1"), link("l2")]), link("l1"), node("b")];

  it("should move a node down within the same parent", () => {
    expect(ids(moveNavigationNode(tree, "l1", undefined, 3))).toEqual([
      ["a", ["a1", "l2"]],
      "b",
      "l1",
    ]);
  });

  it("should move a node up within the same parent", () => {
    expect(ids(moveNavigationNode(tree, "b", undefined, 0))).toEqual([
      "b",
      ["a", ["a1", "l2"]],
      "l1",
    ]);
  });

  it("should move a node to another parent", () => {
    expect(ids(moveNavigationNode(tree, "l1", "a", 1))).toEqual([
      ["a", ["a1", "l1", "l2"]],
      "b",
    ]);
  });

  it("should move a nested node to the root", () => {
    expect(ids(moveNavigationNode(tree, "l2", undefined, 1))).toEqual([
      ["a", ["a1"]],
      "l2",
      "l1",
      "b",
    ]);
  });

  it("should append when no index is given", () => {
    expect(ids(moveNavigationNode(tree, "l1", "b"))).toEqual([
      ["a", ["a1", "l2"]],
      ["b", ["l1"]],
    ]);
  });

  it("should return undefined when the node or parent is missing", () => {
    expect(moveNavigationNode(tree, "missing", undefined, 0)).toBeUndefined();
    expect(moveNavigationNode(tree, "l1", "missing", 0)).toBeUndefined();
  });

  it("should not mutate the input", () => {
    moveNavigationNode(tree, "l2", undefined, 0);
    expect(ids(tree)).toEqual([["a", ["a1", "l2"]], "l1", "b"]);
  });
});

describe("insertNavigationNode", () => {
  const tree = [node("a", [node("a1")]), node("b")];

  it("should insert at the given index", () => {
    expect(ids(insertNavigationNode(tree, link("l"), undefined, 1))).toEqual([
      ["a", ["a1"]],
      "l",
      "b",
    ]);
  });

  it("should insert below a parent, at the end by default", () => {
    expect(ids(insertNavigationNode(tree, link("l"), "a"))).toEqual([
      ["a", ["a1", "l"]],
      "b",
    ]);
  });

  it("should return undefined when the parent is missing", () => {
    expect(insertNavigationNode(tree, link("l"), "missing")).toBeUndefined();
  });
});

describe("findNavigationNode", () => {
  const tree = [node("a", [node("a1"), link("l2")]), link("l1")];

  it("should return the node and its parent id", () => {
    expect(findNavigationNode(tree, "l2")?.parentId).toBe("a");
    expect(findNavigationNode(tree, "l1")?.parentId).toBeUndefined();
    expect(findNavigationNode(tree, "missing")).toBeUndefined();
  });
});

describe("updateNavigationNode", () => {
  const tree = [node("a", [node("a1"), link("l2")]), node("b")];

  it("should replace the node and keep unchanged subtrees", () => {
    const result = updateNavigationNode(tree, "l2", (n) => ({
      ...n,
      title: "Updated",
    }));
    expect(result?.[0].children[1].title).toBe("Updated");
    expect(result?.[1]).toBe(tree[1]);
  });

  it("should return undefined when the node is missing", () => {
    expect(updateNavigationNode(tree, "missing", (n) => n)).toBeUndefined();
  });
});

describe("removeNavigationNode", () => {
  const tree = [node("a", [node("a1"), link("l2")]), node("b")];

  it("should remove the node and return its position", () => {
    const result = removeNavigationNode(tree, "l2");
    expect(ids(result?.nodes)).toEqual([["a", ["a1"]], "b"]);
    expect(result?.parentId).toBe("a");
    expect(result?.index).toBe(1);
    expect(result?.nodes[1]).toBe(tree[1]);
  });
});

describe("filterNavigationNodes", () => {
  it("should remove links at every depth and keep unchanged nodes", () => {
    const tree = [node("a", [node("a1"), link("l2")]), link("l1"), node("b")];
    const result = filterNavigationNodes(tree, (n) => !isLinkNode(n));
    expect(ids(result)).toEqual([["a", ["a1"]], "b"]);
    expect(result[1]).toBe(tree[2]);
  });

  it("should return the same array when nothing is removed", () => {
    const tree = [node("a", [node("a1")])];
    expect(filterNavigationNodes(tree, (n) => !isLinkNode(n))).toBe(tree);
  });
});
