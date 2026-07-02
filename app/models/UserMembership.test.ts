/* oxlint-disable */
import type { NavigationNode } from "@shared/types";
import { DocumentPermission, NavigationNodeType } from "@shared/types";
import stores from "~/stores";

interface ReadCounter {
  count: number;
}

function documentNode(
  id: string,
  children: NavigationNode[] = [],
  readCounter?: ReadCounter
): NavigationNode {
  const node: NavigationNode = {
    id,
    title: id,
    url: `/${id}`,
    type: NavigationNodeType.Document,
    children,
  };

  if (readCounter) {
    Object.defineProperty(node, "children", {
      get() {
        readCounter.count += 1;
        return children;
      },
    });
  }

  return node;
}

describe("UserMembership model", () => {
  test("should cache children by document id", () => {
    const readCounter = { count: 0 };
    const child = documentNode("child");
    const target = documentNode("target", [child], readCounter);
    const membership = stores.userMemberships.add({
      id: "membership-children-index",
      userId: "user",
      documentId: "root",
      permission: DocumentPermission.Read,
      node: documentNode("root", [target]),
    });

    expect(membership.getChildrenForDocument("target")).toEqual([child]);
    const readsAfterFirstLookup = readCounter.count;

    expect(membership.getChildrenForDocument("target")).toEqual([child]);
    expect(readCounter.count).toBe(readsAfterFirstLookup);
  });
});
