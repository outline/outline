import { Op, WhereOptions } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { NavigationNode } from "@shared/types";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { AuthorizationError, NotFoundError } from "@server/errors";
import { Collection, Document, Share } from "@server/models";

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
    throw new Error("teamId required for fetching share using urlId");
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

  return {
    share,
    sharedTree,
    collection: share.collection,
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
