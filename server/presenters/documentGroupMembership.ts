import { DocumentPermission } from "@shared/types";
import { DocumentGroup } from "@server/models";

type Membership = {
  id: string;
  groupId: string;
  documentId: string;
  permission: DocumentPermission;
};

export default (membership: DocumentGroup): Membership => {
  return {
    id: `${membership.groupId}-${membership.documentId}`,
    groupId: membership.groupId,
    documentId: membership.documentId,
    permission: membership.permission,
  };
};
