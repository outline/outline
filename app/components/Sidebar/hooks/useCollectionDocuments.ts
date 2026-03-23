import { useMemo } from "react";
import { sortNavigationNodes } from "@shared/utils/collections";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";

export default function useCollectionDocuments(
  collection: Collection | undefined,
  activeDocument: Document | undefined
) {
  const insertDraftDocument = !!(
    activeDocument &&
    activeDocument.isActive &&
    activeDocument.isDraft &&
    activeDocument.collectionId === collection?.id &&
    !activeDocument.parentDocumentId
  );

  // Only subscribe to asNavigationNode when we actually need to insert a draft
  // into the sorted list. This avoids every CollectionLinkChildren observer
  // re-rendering on every title keystroke.
  const draftNavNode = insertDraftDocument
    ? activeDocument?.asNavigationNode
    : undefined;

  return useMemo(() => {
    if (!collection?.sortedDocuments) {
      return undefined;
    }

    return draftNavNode
      ? sortNavigationNodes(
          [draftNavNode, ...collection.sortedDocuments],
          collection.sort,
          false
        )
      : collection.sortedDocuments;
  }, [draftNavNode, collection?.sortedDocuments, collection?.sort]);
}
