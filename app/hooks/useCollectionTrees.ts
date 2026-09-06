import type { CollectionSort, NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import { sortNavigationNodes } from "@shared/utils/collections";
import { useComputed } from "~/hooks/useComputed";
import useStores from "~/hooks/useStores";
import type Collection from "~/models/Collection";

/**
 * React hook that returns the document structure of all collections in the
 * store as navigation trees. Each node is a copy of the node in the store with
 * extra attributes added – type, collectionId, depth, and parent.
 *
 * @returns the root node of each collection tree.
 */
export default function useCollectionTrees(): NavigationNode[] {
  const { collections } = useStores();

  return useComputed(
    () => collections.orderedData.map(getCollectionTree),
    [collections]
  );
}

/**
 * Builds the navigation tree for a collection.
 *
 * @param collection The collection to build the tree for.
 * @returns the root node of the collection tree.
 */
function getCollectionTree(collection: Collection): NavigationNode {
  const root: NavigationNode = {
    id: collection.id,
    title: collection.name,
    url: collection.path,
    type: NavigationNodeType.Collection,
    collectionId: collection.id,
    depth: 1,
    parent: null,
    children: [],
  };

  root.children = annotateNodes(
    collection.documents ?? [],
    collection.sort,
    root
  );

  return root;
}

/**
 * Copies the given nodes and their descendants in sorted order, adding the
 * attributes needed to traverse and render the tree.
 *
 * @param nodes The nodes to copy.
 * @param sort The sort of the collection the nodes belong to.
 * @param parent The node that the given nodes are children of.
 * @returns the copied nodes.
 */
function annotateNodes(
  nodes: NavigationNode[],
  sort: CollectionSort,
  parent: NavigationNode
): NavigationNode[] {
  if (!nodes.length) {
    return [];
  }

  return sortNavigationNodes(nodes, sort, false).map((node) => {
    const annotated: NavigationNode = {
      ...node,
      type: node.type ?? NavigationNodeType.Document,
      collectionId: parent.collectionId,
      depth: (parent.depth ?? 0) + 1,
      parent,
      children: [],
    };

    annotated.children = annotateNodes(node.children ?? [], sort, annotated);

    return annotated;
  });
}
