import { DocumentPermission } from "@shared/types";
import { GroupMembership } from "@server/models";

type Membership = {
  id: string;
  groupId: string;
  documentId?: string | null;
  permission: DocumentPermission;
};

export default function presentDocumentGroupMembership(
  membership: GroupMembership
): Membership {
  return {
    id: membership.id,
    groupId: membership.groupId,
    documentId: membership.documentId,
    permission: membership.permission as DocumentPermission,
  };
}
