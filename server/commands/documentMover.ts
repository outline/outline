import { sleep } from "@shared/utils/timers";
import { traceFunction } from "@server/logging/tracing";
import { Document, Collection, Pin } from "@server/models";
import { sequelize } from "@server/storage/database";
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

const MAX_RETRIES = 3;

function isOptimisticLockError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { id?: string }).id === "optimistic_lock"
  );
}

async function runMove(
  ctx: APIContext,
  {
    document,
    collectionId,
    parentDocumentId,
    index,
  }: {
    document: Document;
    collectionId: string | null;
    parentDocumentId: string | null;
    index?: number;
  }
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

  // Load the current and next collection. No FOR UPDATE lock: concurrent
  // moves on the same collection are coordinated via optimistic concurrency
  // on `documentStructureVersion` and retried at the savepoint boundary.
  const collection = await Collection.findByPk(document.collectionId!, {
    includeDocumentStructure: true,
    transaction,
    paranoid: false,
  });

  let newCollection = collection;
  if (collectionChanged && collectionId) {
    newCollection = await Collection.findByPk(collectionId, {
      includeDocumentStructure: true,
      transaction,
    });
  } else if (!collectionId) {
    newCollection = null;
  }

  if (document.publishedAt) {
    // Mutate source structure in memory without saving; we'll persist via the
    // version-checked path below.
    const response = await collection?.removeDocumentInStructure(document, {
      transaction,
      save: false,
    });

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

    if (newCollection) {
      // When source and destination are the same instance, both the remove and
      // add mutate `this.documentStructure`; the single save below persists
      // them together with one version bump.
      await newCollection.addDocumentToStructure(document, toIndex, {
        documentJson,
        transaction,
        save: false,
      });
    }

    await Promise.all([
      collectionChanged && collection
        ? collection.saveDocumentStructure({ transaction })
        : null,
      newCollection
        ? newCollection.saveDocumentStructure({ transaction })
        : null,
    ]);
  } else {
    document.collectionId = collectionId;
    document.parentDocumentId = parentDocumentId;
    document.lastModifiedById = user.id;
    document.updatedBy = user;
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

async function documentMover(ctx: APIContext, props: Props): Promise<Result> {
  const {
    document,
    collectionId = null,
    parentDocumentId = null,
    index,
  } = props;

  // Snapshot the document fields we mutate inside `runMove`. On retry the
  // in-memory instance keeps the writes from the previous attempt, so we
  // restore the original values before re-entering the savepoint to keep
  // each attempt deterministic.
  const initial = {
    collectionId: document.collectionId,
    parentDocumentId: document.parentDocumentId,
    lastModifiedById: document.lastModifiedById,
    publishedAt: document.publishedAt,
    updatedBy: document.updatedBy,
    collection: document.collection,
  };

  const outerTransaction = ctx.state.transaction;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      document.collectionId = initial.collectionId;
      document.parentDocumentId = initial.parentDocumentId;
      document.lastModifiedById = initial.lastModifiedById;
      document.publishedAt = initial.publishedAt;
      document.updatedBy = initial.updatedBy;
      document.collection = initial.collection;

      await sleep(5 * 2 ** (attempt - 1) + Math.random() * 5);
    }

    try {
      return await sequelize.transaction(
        { transaction: outerTransaction },
        async (savepoint) => {
          ctx.state.transaction = savepoint;
          try {
            return await runMove(ctx, {
              document,
              collectionId,
              parentDocumentId,
              index,
            });
          } finally {
            ctx.state.transaction = outerTransaction;
          }
        }
      );
    } catch (err) {
      if (isOptimisticLockError(err) && attempt < MAX_RETRIES) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export default traceFunction({
  spanName: "documentMover",
})(documentMover);
