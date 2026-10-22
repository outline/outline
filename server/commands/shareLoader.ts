import type { WhereOptions } from "sequelize";
import { Op } from "sequelize";
import isUUID from "validator/lib/isUUID";
import type { NavigationNode } from "@shared/types";
import { UrlHelper } from "@shared/utils/UrlHelper";
import {
  AuthorizationError,
  InvalidRequestError,
  NotFoundError,
  PaymentRequiredError,
} from "@server/errors";
import type { User } from "@server/models";
import { Collection, Document, Share } from "@server/models";
import { authorize, can } from "@server/policies";

type LoadPublicShareProps = {
  id: string;
  collectionId?: string;
  documentId?: string;
  teamId?: string;
  /** Whether to load the collection, document and shared tree, defaults to true. */
  includeContent?: boolean;
};

/**
 * Loads a published share with its document, collection and shared tree, and
 * checks that it is available to the public.
 *
 * @param props.id The share ID or URL slug.
 * @param props.collectionId An optional collection ID that must match the share.
 * @param props.documentId An optional document ID within the shared tree, not resolved when includeContent is false.
 * @param props.teamId The team ID, required when the share is fetched by URL slug.
 * @param props.includeContent Whether to load the collection, document and shared tree.
 * @returns The share, shared tree, collection and document.
 * @throws NotFoundError if the share is not found or not published.
 * @throws AuthorizationError if sharing is disabled or the document is not in the share.
 */
export async function loadPublicShare({
  id,
  collectionId,
  documentId,
  teamId,
  includeContent = true,
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

  const share = includeContent
    ? await Share.findOne({
        where,
        include: [
          {
            model: Document.scope("withDrafts"),
            as: "document",
            include: [
              {
                model: Collection,
                as: "collection",
                required: false,
              },
            ],
          },
          {
            model: Collection,
            as: "collection",
          },
        ],
      })
    : await Share.unscoped().findOne({
        where,
        include: [
          {
            association: "team",
            attributes: ["id", "sharing", "suspendedAt"],
            required: true,
          },
          {
            model: Document.unscoped(),
            as: "document",
            attributes: ["id", "collectionId", "publishedAt", "archivedAt"],
            include: [
              {
                model: Collection.unscoped(),
                as: "collection",
                attributes: ["id", "sharing", "archivedAt"],
                required: false,
              },
            ],
          },
          {
            model: Collection.unscoped(),
            as: "collection",
            attributes: ["id", "sharing", "archivedAt"],
          },
        ],
      });

  if (
    !share ||
    (teamId && share.teamId !== teamId) ||
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

  if (collectionId && collectionId !== share.collectionId) {
    throw AuthorizationError();
  }

  if (!includeContent) {
    return { share, sharedTree: null, collection: null, document: null };
  }

  let sharedTree: NavigationNode | null = null;
  let document: Document | null = null;

  if (
    associatedCollection &&
    (share.collection || share.includeChildDocuments)
  ) {
    // Raw set so that the cached structure is not marked as changed.
    associatedCollection.set(
      "documentStructure",
      await associatedCollection.getCachedDocumentStructure(),
      { raw: true }
    );
  }

  if (share.collection) {
    sharedTree = associatedCollection?.toNavigationNode() ?? null;
  } else if (share.document && share.includeChildDocuments) {
    sharedTree =
      associatedCollection?.getDocumentTree(share.document.id) ?? null;
  }

  if (sharedTree && share.domain) {
    sharedTree = { ...sharedTree, url: "" };
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
    if (
      collectionShare &&
      can(user, "read", collectionShare) &&
      can(user, "read", collectionShare.collection)
    ) {
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

      parentShare =
        allParentShares?.find(
          (s) => can(user, "read", s) && can(user, "read", s.document)
        ) ?? null;
    }
  }

  return { share, parentShare };
}

/**
 * Recursively extracts all document IDs from a shared tree navigation node.
 *
 * @param sharedTree The navigation node representing the shared tree.
 * @returns Array of all document IDs in the tree.
 */
export function getAllIdsInSharedTree(
  sharedTree: NavigationNode | null
): string[] {
  if (!sharedTree) {
    return [];
  }

  const ids = [sharedTree.id];
  for (const child of sharedTree.children) {
    ids.push(...getAllIdsInSharedTree(child));
  }
  return ids;
}
