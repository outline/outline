import { CollectionPermission, DocumentPermission } from "@shared/types";
import { UserPermission } from "@server/models";

type DocumentMembership = {
  id: string;
  userId: string;
  documentId?: string | null;
  sourceId?: string | null;
  createdById: string;
  permission: CollectionPermission | DocumentPermission;
  index: string | null;
};

export default function presentDocumentMembership(
  membership: UserPermission
): DocumentMembership {
  return {
    id: membership.id,
    userId: membership.userId,
    documentId: membership.documentId,
    permission: membership.permission,
    createdById: membership.createdById,
    sourceId: membership.sourceId,
    index: membership.index,
  };
}
