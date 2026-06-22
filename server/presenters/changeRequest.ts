import type { ChangeRequest } from "@server/models";
import presentUser from "./user";

/**
 * Present a change request for the API.
 *
 * @param changeRequest Change request to present.
 * @return API representation of the change request.
 */
export default function presentChangeRequest(changeRequest: ChangeRequest) {
  return {
    id: changeRequest.id,
    status: changeRequest.status,
    teamId: changeRequest.teamId,
    documentId: changeRequest.documentId,
    draftDocumentId: changeRequest.draftDocumentId,
    baseRevisionId: changeRequest.baseRevisionId,
    submittedById: changeRequest.submittedById,
    submittedBy: changeRequest.submittedBy
      ? presentUser(changeRequest.submittedBy)
      : undefined,
    submittedAt: changeRequest.submittedAt,
    reviewedById: changeRequest.reviewedById,
    reviewedBy: changeRequest.reviewedBy
      ? presentUser(changeRequest.reviewedBy)
      : undefined,
    reviewedAt: changeRequest.reviewedAt,
    reviewNote: changeRequest.reviewNote,
    rejectionReason: changeRequest.rejectionReason,
    createdAt: changeRequest.createdAt,
    updatedAt: changeRequest.updatedAt,
  };
}
