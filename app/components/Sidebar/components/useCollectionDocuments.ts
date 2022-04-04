import * as React from "react";
import { sortNavigationNodes } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import Document from "~/models/Document";

export default function useCollectionDocuments(
  collection: Collection | undefined,
  activeDocument: Document | undefined
) {
  return React.useMemo(() => {
    if (!collection) {
      return [];
    }

    if (
      activeDocument?.isActive &&
      activeDocument?.isDraft &&
      activeDocument?.collectionId === collection.id &&
      !activeDocument?.parentDocumentId
    ) {
      return sortNavigationNodes(
        [activeDocument.asNavigationNode, ...collection.documents],
        collection.sort
      );
    }

    return collection.documents;
  }, [
    activeDocument?.isActive,
    activeDocument?.isDraft,
    activeDocument?.collectionId,
    activeDocument?.parentDocumentId,
    activeDocument?.asNavigationNode,
    collection,
    collection?.documents,
    collection?.id,
    collection?.sort,
  ]);
}
