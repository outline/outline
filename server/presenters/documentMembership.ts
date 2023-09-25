import { CollectionPermission, DocumentPermission } from "@shared/types";
import { UserPermission } from "@server/models";

type DocumentMembership = {
  id: string;
  userId: string;
  documentId?: string | null;
  permission: CollectionPermission | DocumentPermission;
};

export default function presentDocumentMembership(
  membership: UserPermission
): DocumentMembership {
  return {
    id: `${membership.userId}-${membership.documentId}`,
    userId: membership.userId,
    documentId: membership.documentId,
    permission: membership.permission,
  };
}
