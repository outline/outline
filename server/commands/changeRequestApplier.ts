import { ChangeRequestRejectionReason, ChangeRequestStatus } from "@shared/types";
import { InvalidRequestError } from "@server/errors";
import { Document, type ChangeRequest } from "@server/models";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";

type Props = {
  /** Change request to approve. */
  changeRequest: ChangeRequest;
  /** Whether the acting user is a collection maintainer. */
  isMaintainer: boolean;
};

/**
 * Approve a submitted change request and publish the underlying draft.
 *
 * @param ctx API context.
 * @param props Approval properties.
 * @return The approved change request.
 */
export default async function changeRequestApplier(
  ctx: APIContext,
  { changeRequest, isMaintainer }: Props
): Promise<ChangeRequest> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  if (changeRequest.status !== ChangeRequestStatus.Submitted) {
    throw InvalidRequestError("Only submitted change requests can be approved");
  }

  authorize(user, "approve", changeRequest, { isMaintainer });

  const document = await Document.findByPk(changeRequest.draftDocumentId, {
    userId: user.id,
    transaction,
    rejectOnEmpty: true,
  });

  if (!document.isDraft) {
    throw InvalidRequestError("This change request has already been applied");
  }

  if (!document.collectionId) {
    throw InvalidRequestError(
      "Draft must belong to a collection before it can be approved"
    );
  }

  await document.publish(ctx, {
    collectionId: document.collectionId,
  });

  changeRequest.status = ChangeRequestStatus.Approved;
  changeRequest.documentId = document.id;
  changeRequest.reviewedById = user.id;
  changeRequest.reviewedAt = new Date();
  changeRequest.rejectionReason = null;
  changeRequest.reviewNote = null;

  await changeRequest.saveWithCtx(ctx, undefined, { name: "approve" });

  return changeRequest;
}

/**
 * Reject a submitted change request.
 *
 * @param ctx API context.
 * @param changeRequest Change request to reject.
 * @param isMaintainer Whether the acting user is a collection maintainer.
 * @param reviewNote Optional note from the reviewer.
 * @return The rejected change request.
 */
export async function changeRequestRejecter(
  ctx: APIContext,
  changeRequest: ChangeRequest,
  isMaintainer: boolean,
  reviewNote?: string
): Promise<ChangeRequest> {
  const { user } = ctx.state.auth;

  if (changeRequest.status !== ChangeRequestStatus.Submitted) {
    throw InvalidRequestError("Only submitted change requests can be rejected");
  }

  authorize(user, "reject", changeRequest, { isMaintainer });

  changeRequest.status = ChangeRequestStatus.Rejected;
  changeRequest.reviewedById = user.id;
  changeRequest.reviewedAt = new Date();
  changeRequest.reviewNote = reviewNote ?? null;
  changeRequest.rejectionReason = ChangeRequestRejectionReason.Maintainer;

  await changeRequest.saveWithCtx(ctx, undefined, { name: "reject" });

  return changeRequest;
}

/**
 * Withdraw a submitted change request.
 *
 * @param ctx API context.
 * @param changeRequest Change request to withdraw.
 * @return The withdrawn change request.
 */
export async function changeRequestWithdrawer(
  ctx: APIContext,
  changeRequest: ChangeRequest
): Promise<ChangeRequest> {
  const { user } = ctx.state.auth;

  if (changeRequest.status !== ChangeRequestStatus.Submitted) {
    throw InvalidRequestError(
      "Only submitted change requests can be withdrawn"
    );
  }

  authorize(user, "withdraw", changeRequest);

  changeRequest.status = ChangeRequestStatus.Withdrawn;
  changeRequest.reviewedById = null;
  changeRequest.reviewedAt = new Date();
  changeRequest.rejectionReason = ChangeRequestRejectionReason.Withdrawn;

  await changeRequest.saveWithCtx(ctx, undefined, { name: "withdraw" });

  return changeRequest;
}
