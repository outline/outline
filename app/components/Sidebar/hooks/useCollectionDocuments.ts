import { useMemo } from "react";
import { sortNavigationNodes } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import Document from "~/models/Document";

export default function useCollectionDocuments(
  collection: Collection | undefined,
  activeDocument: Document | undefined
) {
  const insertDraftDocument = useMemo(
    () =>
      activeDocument &&
      activeDocument.isActive &&
      activeDocument.isDraft &&
      activeDocument.collectionId === collection?.id &&
      !activeDocument.parentDocumentId,
    [
      activeDocument?.isActive,
      activeDocument?.isDraft,
      activeDocument?.collectionId,
      activeDocument?.parentDocumentId,
      collection?.id,
    ]
  );

  return useMemo(() => {
    if (!collection?.sortedDocuments) {
      return undefined;
    }

    return insertDraftDocument && activeDocument
      ? sortNavigationNodes(
          [activeDocument.asNavigationNode, ...collection.sortedDocuments],
          collection.sort,
          false
        )
      : collection.sortedDocuments;
  }, [
    insertDraftDocument,
    activeDocument?.asNavigationNode,
    collection?.sortedDocuments,
    collection?.sort,
  ]);
}
