import { Op, WhereOptions } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { NavigationNode } from "@shared/types";
import { UrlHelper } from "@shared/utils/UrlHelper";
import {
  AuthorizationError,
  InvalidRequestError,
  NotFoundError,
  PaymentRequiredError,
} from "@server/errors";
import { Collection, Document, Share, User } from "@server/models";
import { authorize, can } from "@server/policies";

type LoadPublicShareProps = {
  id: string;
  collectionId?: string;
  documentId?: string;
  teamId?: string;
};

export async function loadPublicShare({
  id,
  collectionId,
  documentId,
  teamId,
}: LoadPublicShareProps) {
  const urlId =
    !isUUID(id) && UrlHelper.SHARE_URL_SLUG_REGEX.test(id) ? id : undefined;

  if (urlId && !teamId) {
    throw InvalidRequestError("teamId required for fetching share using urlId");
  }

  const where: WhereOptions<Share> = {
    revokedAt: {
      [Op.is]: null,
    },
    published: true,
  };

  if (urlId) {
    where.urlId = id;
    where.teamId = teamId;
  } else {
    where.id = id;
  }

  const share = await Share.findOne({
    where,
    include: [
      {
        model: Document.scope("withDrafts"),
        as: "document",
        include: [
          {
            model: Collection.scope("withDocumentStructure"),
            as: "collection",
            required: false,
          },
        ],
      },
      {
        model: Collection.scope("withDocumentStructure"),
        as: "collection",
      },
    ],
  });

  if (
    !share ||
    !!share.team.suspendedAt ||
    !!share.collection?.archivedAt ||
    !!share.document?.archivedAt
  ) {
    throw NotFoundError();
  }

  const isDraftWithoutCollection =
    !!share.document?.isDraft && !share.document.collectionId;
  const associatedCollection = share.collection ?? share.document?.collection;

  if (
    !share.team.sharing ||
    (!isDraftWithoutCollection && !associatedCollection?.sharing)
  ) {
    throw AuthorizationError();
  }

  let sharedTree: NavigationNode | null = null;
  let document: Document | null = null;

  if (share.collection) {
    sharedTree = associatedCollection?.toNavigationNode() ?? null;
  } else if (share.document && share.includeChildDocuments) {
    sharedTree =
      associatedCollection?.getDocumentTree(share.document.id) ?? null;
  }

  if (collectionId && collectionId !== share.collectionId) {
    throw AuthorizationError();
  }

  if (documentId && documentId !== share.documentId) {
    document = await Document.findByPk(documentId, {
      rejectOnEmpty: true,
    });

    let isDocumentAccessible = share.documentId === document.id;

    if (share.includeChildDocuments) {
      const allIdsInSharedTree = getAllIdsInSharedTree(sharedTree);
      isDocumentAccessible = allIdsInSharedTree.includes(document.id);
    }

    if (!isDocumentAccessible) {
      throw AuthorizationError();
    }
  } else {
    document = share.document;
  }

  if (document?.isTrialImport) {
    throw PaymentRequiredError();
  }

  return {
    share,
    sharedTree,
    collection: share.collection,
    document,
  };
}

type LoadShareWithParentProps = {
  collectionId?: string;
  documentId?: string;
  user: User;
};

export async function loadShareWithParent({
  collectionId,
  documentId,
  user,
}: LoadShareWithParentProps) {
  const where: WhereOptions<Share> = {
    revokedAt: {
      [Op.is]: null,
    },
    teamId: user.teamId,
  };

  if (collectionId) {
    where.collectionId = collectionId;
  } else if (documentId) {
    where.documentId = documentId;
  }

  const share = await Share.scope({
    method: ["withCollectionPermissions", user.id],
  }).findOne({ where });

  if (!share) {
    throw NotFoundError();
  }

  authorize(user, "read", share);

  if (collectionId) {
    authorize(user, "read", share.collection);
  }

  let parentShare: Share | null = null;

  // Load the parent shares and return one (needed for share toggle in UI).
  // Parent share is needed for documents only since collections don't have parents.
  if (documentId) {
    authorize(user, "read", share.document);

    const docCollectionId = share.document.collectionId;

    if (!docCollectionId) {
      throw NotFoundError("Collection not found for the shared document");
    }

    const docCollection = await Collection.findByPk(docCollectionId, {
      userId: user.id,
      includeDocumentStructure: true,
      rejectOnEmpty: true,
    });

    const collectionShare = await Share.scope({
      method: ["withCollectionPermissions", user.id],
    }).findOne({
      where: {
        revokedAt: {
          [Op.is]: null,
        },
        published: true,
        teamId: user.teamId,
        collectionId: docCollectionId,
      },
    });

    // prefer collection share if it exists and user has read access.
    if (collectionShare && can(user, "read", collectionShare)) {
      parentShare = collectionShare;
    } else {
      const parentDocIds = docCollection.getDocumentParents(documentId);

      const allParentShares = parentDocIds
        ? await Share.scope({
            method: ["withCollectionPermissions", user.id],
          }).findAll({
            where: {
              revokedAt: {
                [Op.is]: null,
              },
              published: true,
              teamId: user.teamId,
              includeChildDocuments: true,
              documentId: parentDocIds,
            },
          })
        : null;

      parentShare = allParentShares?.find((s) => can(user, "read", s)) ?? null;
    }
  }

  return { share, parentShare };
}

function getAllIdsInSharedTree(sharedTree: NavigationNode | null): string[] {
  if (!sharedTree) {
    return [];
  }

  const ids = [sharedTree.id];
  for (const child of sharedTree.children) {
    ids.push(...getAllIdsInSharedTree(child));
  }
  return ids;
}
