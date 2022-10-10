import { CollectionPermission, DocumentPermission } from "@shared/types";
import { CollectionUser, DocumentUser } from "@server/models";

type CollectionMembership = {
  id: string;
  userId: string;
  collectionId: string;
  permission: CollectionPermission;
};

type DocumentMembership = {
  id: string;
  userId: string;
  documentId: string;
  permission: DocumentPermission;
};

const isCollectionUser = (
  membership: CollectionUser | DocumentUser
): membership is CollectionUser =>
  !!(membership as CollectionUser).collectionId;

export default <U extends CollectionUser | DocumentUser>(
  membership: U
): U extends CollectionUser ? CollectionMembership : DocumentMembership => {
  if (isCollectionUser(membership)) {
    return ({
      id: `${membership.userId}-${membership.collectionId}`,
      userId: membership.userId,
      collectionId: membership.collectionId,
      permission: membership.permission,
    } as CollectionMembership) as any;
  }

  return ({
    id: `${membership.userId}-${membership.documentId}`,
    userId: membership.userId,
    documentId: membership.documentId,
    permission: membership.permission,
  } as DocumentMembership) as any;
};
