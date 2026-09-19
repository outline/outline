import { traceFunction } from "@server/logging/tracing";
import { InvalidRequestError, ValidationError } from "@server/errors";
import { Collection, Document, Revision } from "@server/models";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";
import { assertPresent } from "@server/validation";

type Props = {
  /** The document to restore. Must be loaded with `paranoid: false`. */
  document: Document;
  /** Destination collection to restore into. Defaults to the original collection. */
  collectionId?: string | null;
  /** Destination parent document, null for the collection root. Defaults to the original parent. */
  parentDocumentId?: string | null;
  /** Revision to restore the document's content from, when not archived or deleted. */
  revisionId?: string | null;
};

/**
 * Restores a previously archived or deleted document, or restores a document's
 * content to a specific revision. Re-attaches the document to the destination
 * collection's structure when applicable and authorizes the acting user.
 *
 * @param ctx - the API context, providing the acting user and transaction.
 * @param props - the document and restore options.
 * @returns the restored document.
 * @throws ValidationError if the destination collection is not active.
 * @throws InvalidRequestError if the destination parent document is invalid.
 * @throws NotFoundError if the given revision or parent does not exist.
 */
async function documentRestorer(
  ctx: APIContext,
  { document, collectionId, parentDocumentId, revisionId }: Props
): Promise<Document> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  const parent = parentDocumentId
    ? await Document.findByPk(parentDocumentId, {
        userId: user.id,
        rejectOnEmpty: true,
        transaction,
      })
    : undefined;

  if (parent) {
    if (parent.id === document.id) {
      throw InvalidRequestError("Cannot restore document inside itself");
    }

    const childDocumentIds = await document.findAllChildDocumentIds(undefined, {
      paranoid: false,
      transaction,
    });
    if (childDocumentIds.includes(parent.id)) {
      throw InvalidRequestError(
        "Cannot restore document inside one of its own children"
      );
    }

    authorize(user, "update", parent);

    if (!parent.publishedAt) {
      throw InvalidRequestError("Cannot restore document inside a draft");
    }
    if (collectionId && parent.collectionId !== collectionId) {
      throw InvalidRequestError(
        "Parent document must belong to the destination collection"
      );
    }
  }

  const sourceCollectionId = document.collectionId;
  const destCollectionId =
    collectionId ?? parent?.collectionId ?? sourceCollectionId;

  const srcCollection = sourceCollectionId
    ? await Collection.findByPk(sourceCollectionId, {
        userId: user.id,
        includeDocumentStructure: true,
        paranoid: false,
        transaction,
      })
    : undefined;

  const destCollection = destCollectionId
    ? await Collection.findByPk(destCollectionId, {
        userId: user.id,
        includeDocumentStructure: true,
        transaction,
      })
    : undefined;

  if (!destCollection?.isActive) {
    throw ValidationError(
      "Unable to restore, the collection may have been deleted or archived"
    );
  }

  if (sourceCollectionId && sourceCollectionId !== destCollection.id) {
    authorize(user, "updateDocument", srcCollection);
    await srcCollection?.removeDocumentInStructure(document, {
      save: true,
      transaction,
    });
  }

  if (document.deletedAt) {
    authorize(user, "restore", document);
    authorize(user, "updateDocument", destCollection);

    // restore a previously deleted document
    await document.restoreTo(ctx, {
      collectionId: destCollection.id,
      parentDocumentId,
    });
  } else if (document.archivedAt) {
    authorize(user, "unarchive", document);
    authorize(user, "updateDocument", destCollection);

    // restore a previously archived document
    await document.restoreTo(ctx, {
      collectionId: destCollection.id,
      parentDocumentId,
    });
  } else if (revisionId) {
    // restore a document to a specific revision
    authorize(user, "update", document);
    const revision = await Revision.findByPk(revisionId, {
      transaction,
      rejectOnEmpty: true,
    });
    authorize(document, "restore", revision);

    await document.restoreFromRevision(revision);
    await document.saveWithCtx(ctx, undefined, { name: "restore" });
  } else {
    assertPresent(revisionId, "revisionId is required");
  }

  return document;
}

export default traceFunction({
  spanName: "documentRestorer",
})(documentRestorer);
