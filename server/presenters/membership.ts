import { CollectionPermission, DocumentPermission } from "@shared/types";
import { UserMembership } from "@server/models";

type Membership = {
  id: string;
  userId: string;
  collectionId?: string | null;
  documentId?: string | null;
  sourceId?: string | null;
  createdById: string;
  permission: CollectionPermission | DocumentPermission;
  index: string | null;
};

export default function presentMembership(
  membership: UserMembership
): Membership {
  return {
    id: membership.id,
    userId: membership.userId,
    documentId: membership.documentId,
    collectionId: membership.collectionId,
    permission: membership.permission,
    createdById: membership.createdById,
    sourceId: membership.sourceId,
    index: membership.index,
  };
}
