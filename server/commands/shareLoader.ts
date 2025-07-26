import { Op, WhereOptions } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { NavigationNode } from "@shared/types";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { AuthorizationError, NotFoundError } from "@server/errors";
import { Collection, Document, Share, User } from "@server/models";
import { authorize, can } from "@server/policies";

type Props = {
  id?: string;
  collectionId?: string;
  documentId?: string;
  teamId?: string;
  user?: User;
};

type Result = {
  share: Share;
  parentShare: Share | null;
  sharedTree: NavigationNode | null;
  collection: Collection | null;
  document: Document | null;
};

export async function loadShare({
  id,
  collectionId,
  documentId,
  teamId,
  user,
}: Props): Promise<Result> {
  if (!id && !((collectionId || documentId) && user)) {
    throw new Error(
      "Either id (or) collectionId/documentId with user must be provided"
    );
  }

  let share: Share | null = null;
  let parentShare: Share | null = null;
  let sharedTree: NavigationNode | null = null;
  let collection: Collection | null = null;
  let document: Document | null = null;

  if (id) {
    const urlId =
      !isUUID(id) && UrlHelper.SHARE_URL_SLUG_REGEX.test(id) ? id : undefined;

    if (urlId && !teamId) {
      throw new Error("teamId required for fetching share using urlId");
    }

    const where: WhereOptions<Share> = {
      revokedAt: {
        [Op.is]: null,
      },
      published: true,
    };

    if (urlId) {
      where.urlId = urlId;
      where.teamId = teamId;
    } else {
      where.id = id;
    }

    share = await Share.findOne({
      where,
      include: [
        {
          model: Document.scope([
            "withDrafts",
            { method: ["withMembership", user?.id] },
          ]),
          as: "document",
          include: [
            {
              model: Collection.scope([
                "withDocumentStructure",
                { method: ["withMembership", user?.id] },
              ]),
              as: "collection",
              required: false,
            },
          ],
        },
        {
          model: Collection.scope([
            "withDocumentStructure",
            { method: ["withMembership", user?.id] },
          ]),
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

    if (share.collection) {
      sharedTree = associatedCollection?.toNavigationNode() ?? null;
    } else if (share.document && share.includeChildDocuments) {
      sharedTree =
        associatedCollection?.getDocumentTree(share.document.id) ?? null;
    }

    if (collectionId && collectionId !== share.collectionId) {
      collection = await Collection.findByPk(collectionId, {
        userId: user ? user.id : undefined,
        includeDocumentStructure: true,
        rejectOnEmpty: true,
      });

      if (collection.id !== share.collectionId) {
        throw AuthorizationError();
      }
    } else {
      collection = share.collection;
    }

    if (documentId && documentId !== share.documentId) {
      document = await Document.findByPk(documentId, {
        userId: user ? user.id : undefined,
        paranoid: false,
        rejectOnEmpty: true,
      });

      const allIdsInSharedTree = share.includeChildDocuments
        ? getAllIdsInSharedTree(sharedTree)
        : [document.id];
      if (!allIdsInSharedTree.includes(document.id)) {
        throw AuthorizationError();
      }
    } else {
      document = share.document;
    }
  } else {
    // Validation would ensure collectionId or documentId, & user are available here.
    const where: WhereOptions<Share> = {
      revokedAt: {
        [Op.is]: null,
      },
      teamId: user!.teamId,
    };

    if (collectionId) {
      where.collectionId = collectionId;
    } else if (documentId) {
      where.documentId = documentId;
    }

    share = await Share.scope({
      method: ["withCollectionPermissions", user!.id],
    }).findOne({ where });

    if (!share) {
      throw NotFoundError();
    }

    authorize(user!, "read", share);

    if (collectionId) {
      authorize(user!, "read", share.collection);
    }

    // Load the parent shares and return one (needed for share toggle in UI).
    // Parent share is needed for documents only since collections don't have parents.
    if (documentId) {
      authorize(user!, "read", share.document);

      const docCollectionId = share.document.collectionId;

      if (!docCollectionId) {
        throw NotFoundError("Collection not found for the shared document");
      }

      const docCollection = await Collection.findByPk(docCollectionId, {
        userId: user!.id,
        includeDocumentStructure: true,
        rejectOnEmpty: true,
      });

      const collectionShare = await Share.scope({
        method: ["withCollectionPermissions", user!.id],
      }).findOne({
        where: {
          revokedAt: {
            [Op.is]: null,
          },
          published: true,
          teamId: user!.teamId,
          collectionId: docCollectionId,
        },
      });

      // prefer collection share if it exists and user has read access.
      if (collectionShare && can(user!, "read", collectionShare)) {
        parentShare = collectionShare;
      } else {
        const parentDocIds = docCollection.getDocumentParents(documentId);

        const allParentShares = parentDocIds
          ? await Share.scope({
              method: ["withCollectionPermissions", user!.id],
            }).findAll({
              where: {
                revokedAt: {
                  [Op.is]: null,
                },
                published: true,
                teamId: user!.teamId,
                includeChildDocuments: true,
                documentId: parentDocIds,
              },
            })
          : null;

        parentShare =
          allParentShares?.find((s) => can(user!, "read", s)) ?? null;
      }
    }
  }

  return {
    share,
    parentShare,
    sharedTree,
    collection,
    document,
  };
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
