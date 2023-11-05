import { CollectionPermission, DocumentPermission } from "@shared/types";
import { UserPermission } from "@server/models";

type DocumentMembership = {
  id: string;
  userId: string;
  documentId?: string | null;
  permission: CollectionPermission | DocumentPermission;
  index: string | null;
};

export default function presentDocumentMembership(
  membership: UserPermission
): DocumentMembership {
  return {
    id: membership.getId(),
    userId: membership.userId,
    documentId: membership.documentId,
    permission: membership.permission,
    index: membership.index,
  };
}
