import * as React from "react";
import { NavigationNode, NavigationNodeType } from "@shared/types";
import { sortNavigationNodes } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";

/**
 * React hook that modifies the document structure
 * of all collections present in store. Adds extra attributes
 * like type, depth and parent to each of the nodes in document
 * structure.
 *
 * @return {NavigationNode[]} collectionTrees root collection nodes of modified trees
 */
export default function useCollectionTrees(): NavigationNode[] {
  const { collections } = useStores();

  const getCollectionTree = (collection: Collection): NavigationNode => {
    const addType = (node: NavigationNode): NavigationNode => {
      if (node.children.length > 0) {
        node.children = node.children.map(addType);
      }

      node.type = node.type ? node.type : NavigationNodeType.Document;
      return node;
    };

    const addParent = (
      node: NavigationNode,
      parent: NavigationNode | null = null
    ): NavigationNode => {
      if (node.children.length > 0) {
        node.children = node.children.map((child) => addParent(child, node));
      }

      node.parent = parent;
      return node;
    };

    const addDepth = (node: NavigationNode, depth = 0): NavigationNode => {
      if (node.children.length > 0) {
        node.children = node.children.map((child) =>
          addDepth(child, depth + 1)
        );
      }

      node.depth = depth;
      return node;
    };

    const addCollectionId = (
      node: NavigationNode,
      collectionId = collection.id
    ): NavigationNode => {
      if (node.children.length > 0) {
        node.children = node.children.map((child) =>
          addCollectionId(child, collectionId)
        );
      }

      node.collectionId = collectionId;
      return node;
    };

    const collectionNode: NavigationNode = {
      id: collection.id,
      title: collection.name,
      url: collection.path,
      type: NavigationNodeType.Collection,
      children: collection.documents
        ? sortNavigationNodes(collection.documents, collection.sort, true)
        : [],
      parent: null,
    };

    return addParent(addCollectionId(addDepth(addType(collectionNode))));
  };

  const key = collections.orderedData.map((o) => o.documents?.length).join("-");
  const collectionTrees = React.useMemo(
    () => collections.orderedData.map(getCollectionTree),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collections.orderedData, key]
  );

  return collectionTrees;
}
