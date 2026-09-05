import { clamp } from "es-toolkit";
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
  const draftIndex = insertDraftDocument ? activeDocument?.index : undefined;

  return useMemo(() => {
    if (!collection?.sortedDocuments) {
      return undefined;
    }

    if (!draftNavNode) {
      return collection.sortedDocuments;
    }

    const nodes = [...collection.sortedDocuments];
    nodes.splice(clamp(draftIndex ?? 0, 0, nodes.length), 0, draftNavNode);

    return sortNavigationNodes(nodes, collection.sort, false);
  }, [draftNavNode, draftIndex, collection?.sortedDocuments, collection?.sort]);
}
