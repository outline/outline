import { traceFunction } from "@server/logging/tracing";
import { ValidationError } from "@server/errors";
import { Collection, Revision } from "@server/models";
import type { Document } from "@server/models";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";
import { assertPresent } from "@server/validation";

type Props = {
  /** The document to restore. Must be loaded with `paranoid: false`. */
  document: Document;
  /** Destination collection to restore into. Defaults to the original collection. */
  collectionId?: string | null;
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
 */
async function documentRestorer(
  ctx: APIContext,
  { document, collectionId, revisionId }: Props
): Promise<Document> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

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
    await document.restoreTo(ctx, { collectionId: destCollection.id });
  } else if (document.archivedAt) {
    authorize(user, "unarchive", document);
    authorize(user, "updateDocument", destCollection);

    // restore a previously archived document
    await document.restoreTo(ctx, { collectionId: destCollection.id });
  } else if (revisionId) {
    // restore a document to a specific revision
    authorize(user, "update", document);
    const revision = await Revision.findByPk(revisionId, { transaction });
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
