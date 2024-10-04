import { GroupMembership } from "@server/models";

export default function presentGroupMembership(membership: GroupMembership) {
  return {
    id: membership.id,
    groupId: membership.groupId,
    documentId: membership.documentId,
    collectionId: membership.collectionId,
    permission: membership.permission,
    sourceId: membership.sourceId,
  };
}
