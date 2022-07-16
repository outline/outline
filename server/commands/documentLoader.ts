import invariant from "invariant";
import { Op } from "sequelize";
import {
  NotFoundError,
  InvalidRequestError,
  AuthorizationError,
  AuthenticationError,
} from "@server/errors";
import { Collection, Document, Share, User, Team } from "@server/models";
import { authorize, can } from "@server/policies";

type Props = {
  id?: string;
  shareId?: string;
  user?: User;
};

type Result = {
  document: Document;
  share?: Share;
  collection: Collection;
};

export default async function loadDocument({
  id,
  shareId,
  user,
}: Props): Promise<Result> {
  let document;
  let collection;
  let share;

  if (!shareId && !(id && user)) {
    throw AuthenticationError(`Authentication or shareId required`);
  }

  if (shareId) {
    share = await Share.findOne({
      where: {
        revokedAt: {
          [Op.is]: null,
        },
        id: shareId,
      },
      include: [
        {
          // unscoping here allows us to return unpublished documents
          model: Document.unscoped(),
          include: [
            {
              model: User,
              as: "createdBy",
              paranoid: false,
            },
            {
              model: User,
              as: "updatedBy",
              paranoid: false,
            },
          ],
          required: true,
          as: "document",
        },
      ],
    });

    if (!share || share.document?.archivedAt) {
      throw InvalidRequestError("Document could not be found for shareId");
    }

    // It is possible to pass both an id and a shareId to the documents.info
    // endpoint. In this case we'll load the document based on the `id` and check
    // if the provided share token allows access. This is used by the frontend
    // to navigate nested documents from a single share link.
    if (id) {
      document = await Document.findByPk(id, {
        userId: user ? user.id : undefined,
        paranoid: false,
      }); // otherwise, if the user has an authenticated session make sure to load
      // with their details so that we can return the correct policies, they may
      // be able to edit the shared document
    } else if (user) {
      document = await Document.findByPk(share.documentId, {
        userId: user.id,
        paranoid: false,
      });
    } else {
      document = share.document;
    }

    if (!document) {
      throw NotFoundError("Document could not be found for shareId");
    }

    // If the user has access to read the document, we can just update
    // the last access date and return the document without additional checks.
    const canReadDocument = user && can(user, "read", document);

    if (canReadDocument) {
      await share.update({
        lastAccessedAt: new Date(),
      });

      // Cannot use document.collection here as it does not include the
      // documentStructure by default through the relationship.
      collection = await Collection.findByPk(document.collectionId);
      if (!collection) {
        throw NotFoundError("Collection could not be found for document");
      }

      return {
        document,
        share,
        collection,
      };
    }

    // "published" === on the public internet.
    // We already know that there's either no logged in user or the user doesn't
    // have permission to read the document, so we can throw an error.
    if (!share.published) {
      throw AuthorizationError();
    }

    // It is possible to disable sharing at the collection so we must check
    collection = await Collection.findByPk(document.collectionId);
    invariant(collection, "collection not found");

    if (!collection.sharing) {
      throw AuthorizationError();
    }

    // If we're attempting to load a document that isn't the document originally
    // shared then includeChildDocuments must be enabled and the document must
    // still be active and nested within the shared document
    if (share.documentId !== document.id) {
      if (!share.includeChildDocuments) {
        throw AuthorizationError();
      }

      const childDocumentIds =
        (await share.document?.getChildDocumentIds({
          archivedAt: {
            [Op.is]: null,
          },
        })) ?? [];

      if (!childDocumentIds.includes(document.id)) {
        throw AuthorizationError();
      }
    }

    // It is possible to disable sharing at the team level so we must check
    const team = await Team.findByPk(document.teamId, { rejectOnEmpty: true });

    if (!team.sharing) {
      throw AuthorizationError();
    }

    await share.update({
      lastAccessedAt: new Date(),
    });
  } else {
    document = await Document.findByPk(id as string, {
      userId: user ? user.id : undefined,
      paranoid: false,
    });

    if (!document) {
      throw NotFoundError();
    }

    if (document.deletedAt) {
      // don't send data if user cannot restore deleted doc
      user && authorize(user, "restore", document);
    } else {
      user && authorize(user, "read", document);
    }

    collection = document.collection;
  }

  return {
    document,
    share,
    collection,
  };
}
