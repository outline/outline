import { Transaction } from "sequelize";
import { traceFunction } from "@server/logging/tracing";
import { Document, Collection, Pin } from "@server/models";
import type { APIContext } from "@server/types";

type Props = {
  /** Document which is being moved */
  document: Document;
  /** Destination collection to which the document is moved */
  collectionId: string | null;
  /** ID of parent under which the document is moved */
  parentDocumentId?: string | null;
  /** Position of moved document within document structure */
  index?: number;
};

type Result = {
  collections: Collection[];
  documents: Document[];
  collectionChanged: boolean;
};

async function documentMover(
  ctx: APIContext,
  {
    document,
    collectionId,
    parentDocumentId = null,
    // convert undefined to null so parentId comparison treats them as equal
    index,
  }: Props
): Promise<Result> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  const collectionChanged = collectionId !== document.collectionId;
  const previousCollectionId = document.collectionId;
  const result: Result = {
    collections: [],
    documents: [],
    collectionChanged,
  };

  // Load the current and the next collection upfront and lock them
  const collection = await Collection.findByPk(document.collectionId!, {
    includeDocumentStructure: true,
    transaction,
    lock: Transaction.LOCK.NO_KEY_UPDATE,
    paranoid: false,
  });

  let newCollection = collection;
  if (collectionChanged && collectionId) {
    newCollection = await Collection.findByPk(collectionId, {
      includeDocumentStructure: true,
      transaction,
      lock: Transaction.LOCK.NO_KEY_UPDATE,
    });
  } else if (!collectionId) {
    newCollection = null;
  }

  if (document.publishedAt) {
    // Remove the document from the current collection
    const response = await collection?.removeDocumentInStructure(
      ctx,
      document,
      {
        save: collectionChanged,
      }
    );

    let documentJson = response?.[0];
    const fromIndex = response?.[1] || 0;

    if (!documentJson) {
      documentJson = await document.toNavigationNode({ transaction });
    }

    // if we're reordering from within the same parent
    // the original and destination collection are the same,
    // so when the initial item is removed above, the list will reduce by 1.
    // We need to compensate for this when reordering
    const toIndex =
      index !== undefined &&
      document.parentDocumentId === parentDocumentId &&
      document.collectionId === collectionId &&
      fromIndex < index
        ? index - 1
        : index;

    // Update the properties on the document record, this must be done after
    // the toIndex is calculated above
    document.collectionId = collectionId;
    document.parentDocumentId = parentDocumentId;
    document.lastModifiedById = user.id;
    document.updatedBy = user;
    // Moving out of all collections converts the document to a draft, remember the position it
    // held so that it can be restored if published again.
    document.index = collectionId ? null : fromIndex;

    if (newCollection) {
      // Add the document and it's tree to the new collection
      await newCollection.addDocumentToStructure(ctx, document, toIndex, {
        documentJson,
      });
    }
  } else {
    // Drafts are not in the document structure, so their position is stored on the document
    // itself. The index arrives relative to a list that the draft is rendered within, so when
    // reordering under the same parent we compensate for the draft's own place in that list.
    const fromIndex = document.index ?? 0;
    const toIndex =
      index !== undefined &&
      document.parentDocumentId === parentDocumentId &&
      document.collectionId === collectionId &&
      fromIndex < index
        ? index - 1
        : index;

    document.collectionId = collectionId;
    document.parentDocumentId = parentDocumentId;
    document.lastModifiedById = user.id;
    document.updatedBy = user;
    // Without an explicit index the draft falls back to the top of its new parent.
    document.index = toIndex ?? null;
  }

  if (collection && document.publishedAt) {
    result.collections.push(collection);
  }

  // If the collection has changed then we also need to update the properties
  // on all of the documents children to reflect the new collectionId
  if (collectionChanged) {
    // Efficiently find the ID's of all the documents that are children of
    // the moved document and update in one query
    const childDocumentIds = await document.findAllChildDocumentIds();

    if (collectionId) {
      // Reload the collection to get relationship data
      newCollection = await Collection.findByPk(collectionId, {
        userId: user.id,
        includeDocumentStructure: true,
        rejectOnEmpty: true,
        transaction,
      });

      result.collections.push(newCollection);

      await Document.update(
        {
          collectionId: newCollection.id,
        },
        {
          transaction,
          where: {
            id: childDocumentIds,
          },
        }
      );
    } else {
      // document will be moved to drafts
      document.publishedAt = null;

      // point children's parent to moved document's parent
      await Document.update(
        {
          parentDocumentId: document.parentDocumentId,
        },
        {
          transaction,
          where: {
            id: childDocumentIds,
          },
        }
      );
    }

    // We must reload from the database to get the relationship data
    const documents = await Document.findAll({
      where: {
        id: childDocumentIds,
      },
      transaction,
    });

    document.collection = newCollection;
    result.documents.push(
      ...documents.map((doc) => {
        if (newCollection) {
          doc.collection = newCollection;
        }
        return doc;
      })
    );

    // If the document was pinned to the collection then we also need to
    // automatically remove the pin to prevent a confusing situation where
    // a document is pinned from another collection. Use the command to ensure
    // the correct events are emitted.
    const pin = await Pin.findOne({
      where: {
        documentId: document.id,
        collectionId: previousCollectionId,
      },
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });

    await pin?.destroyWithCtx(ctx);
  }

  result.documents.push(document);

  await document.saveWithCtx(ctx, undefined, {
    name: "move",
    data: {
      collectionIds: result.collections.map((c) => c.id),
      documentIds: result.documents.map((d) => d.id),
    },
  });

  // we need to send all updated models back to the client
  return result;
}

export default traceFunction({
  spanName: "documentMover",
})(documentMover);
