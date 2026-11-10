import { NavigationNodeType, type NavigationNode } from "../types";
import { moveNavigationNode } from "./collections";

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
