import * as React from "react";
import { NavigationNode, NavigationNodeType } from "@shared/types";
import Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";

export default function useCollectionsTree() {
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

    let collectionNode: NavigationNode = {
      id: collection.id,
      title: collection.name,
      url: collection.url,
      type: NavigationNodeType.Collection,
      children: collection.documents || [],
      parent: null,
    };

    collectionNode = addType(collectionNode);
    collectionNode = addDepth(collectionNode);
    collectionNode = addCollectionId(collectionNode);
    collectionNode = addParent(collectionNode);

    return collectionNode;
  };

  return React.useMemo(() => collections.orderedData.map(getCollectionTree), [
    collections.orderedData,
  ]);
}
