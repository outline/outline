import { DocumentPermission } from "@shared/types";
import DocumentUser from "@server/models/DocumentUser";

type DocumentMembership = {
  id: string;
  userId: string;
  documentId: string;
  permission: DocumentPermission;
};

export default function presentDocumentMembership(
  membership: DocumentUser
): DocumentMembership {
  return {
    id: `${membership.userId}-${membership.documentId}`,
    userId: membership.userId,
    documentId: membership.documentId,
    permission: membership.permission,
  };
}
