import { Relationship } from "@server/models";

export default function presentRelationship(relationship: Relationship) {
  return {
    id: relationship.id,
    type: relationship.type,
    documentId: relationship.documentId,
    reverseDocumentId: relationship.reverseDocumentId,
    userId: relationship.userId,
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt,
  };
}
