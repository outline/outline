import * as React from "react";
import { sortNavigationNodes } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import Document from "~/models/Document";

export default function useCollectionDocuments(
  collection: Collection | undefined,
  activeDocument: Document | undefined
) {
  return React.useMemo(() => {
    if (!collection?.sortedDocuments) {
      return undefined;
    }

    const insertDraftDocument =
      activeDocument?.isActive &&
      activeDocument?.isDraft &&
      activeDocument?.collectionId === collection.id &&
      !activeDocument?.parentDocumentId;

    return insertDraftDocument
      ? sortNavigationNodes(
          [activeDocument.asNavigationNode, ...collection.sortedDocuments],
          collection.sort,
          false
        )
      : collection.sortedDocuments;
  }, [
    activeDocument?.isActive,
    activeDocument?.isDraft,
    activeDocument?.collectionId,
    activeDocument?.parentDocumentId,
    activeDocument?.asNavigationNode,
    collection,
    collection?.sortedDocuments,
    collection?.id,
    collection?.sort,
  ]);
}
