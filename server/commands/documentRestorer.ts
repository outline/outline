import { traceFunction } from "@server/logging/tracing";
import { ParamRequiredError, ValidationError } from "@server/errors";
import { Collection, Revision } from "@server/models";
import type { Document } from "@server/models";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";

type Props = {
  /** The document to restore. Must be loaded with `paranoid: false`. */
  document: Document;
  /** Destination collection to restore into. Defaults to the original collection. */
  collectionId?: string | null;
  /** Revision to restore the document's content from, when not archived or deleted. The collection is not changed. */
  revisionId?: string | null;
};

/**
 * Restores a previously archived or deleted document, or restores an active
 * document's content to a specific revision. Archived and deleted documents
 * are re-attached to the destination collection's structure. Authorizes the
 * acting user against the document before any other check.
 *
 * @param ctx - the API context, providing the acting user and transaction.
 * @param props - the document and restore options.
 * @returns the restored document.
 * @throws AuthorizationError if the user cannot restore the document.
 * @throws ValidationError if the destination collection is not active.
 * @throws NotFoundError if the given revision does not exist.
 */
async function documentRestorer(
  ctx: APIContext,
  { document, collectionId, revisionId }: Props
): Promise<Document> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  if (!document.deletedAt && !document.archivedAt) {
    // restore an active document to a specific revision
    authorize(user, "update", document);
    if (!revisionId) {
      throw ParamRequiredError("revisionId is required");
    }

    const revision = await Revision.findByPk(revisionId, {
      transaction,
      rejectOnEmpty: true,
    });
    authorize(document, "restore", revision);

    await document.restoreFromRevision(revision);
    await document.saveWithCtx(ctx, undefined, { name: "restore" });
    return document;
  }

  authorize(user, document.deletedAt ? "restore" : "unarchive", document);

  const sourceCollectionId = document.collectionId;
  const destCollectionId = collectionId ?? sourceCollectionId;

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
  authorize(user, "updateDocument", destCollection);

  if (sourceCollectionId && sourceCollectionId !== destCollection.id) {
    authorize(user, "updateDocument", srcCollection);
    await srcCollection?.removeDocumentInStructure(document, {
      save: true,
      transaction,
    });
  }

  // restore a previously archived or deleted document
  await document.restoreTo(ctx, { collectionId: destCollection.id });

  return document;
}

export default traceFunction({
  spanName: "documentRestorer",
})(documentRestorer);
