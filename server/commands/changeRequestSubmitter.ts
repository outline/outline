import { Op } from "sequelize";
import { ChangeRequestStatus } from "@shared/types";
import { InvalidRequestError } from "@server/errors";
import { ChangeRequest, Collection, Document } from "@server/models";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";

type Props = {
  /** Draft document to submit for review. */
  draftDocumentId: string;
};

/**
 * Submit a new-page draft for maintainer review.
 *
 * @param ctx API context.
 * @param props Submission properties.
 * @return The submitted change request.
 */
export default async function changeRequestSubmitter(
  ctx: APIContext,
  { draftDocumentId }: Props
): Promise<ChangeRequest> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  const document = await Document.findByPk(draftDocumentId, {
    userId: user.id,
    transaction,
    rejectOnEmpty: true,
  });

  if (!document.isDraft) {
    throw InvalidRequestError("Only drafts can be submitted for review");
  }

  const collection = document.collectionId
    ? await Collection.findByPk(document.collectionId, {
        userId: user.id,
        transaction,
        rejectOnEmpty: true,
      })
    : null;

  if (!collection?.maintainerApprovalRequired) {
    throw InvalidRequestError(
      "This collection does not require approval before publishing"
    );
  }

  authorize(user, "update", document);

  const existingChangeRequest = await ChangeRequest.findOne({
    where: {
      draftDocumentId: document.id,
      status: {
        [Op.in]: [ChangeRequestStatus.Draft, ChangeRequestStatus.Submitted],
      },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (existingChangeRequest?.status === ChangeRequestStatus.Submitted) {
    throw InvalidRequestError("This draft has already been submitted for review");
  }

  if (existingChangeRequest) {
    existingChangeRequest.status = ChangeRequestStatus.Submitted;
    existingChangeRequest.submittedById = user.id;
    existingChangeRequest.submittedAt = new Date();
    await existingChangeRequest.saveWithCtx(ctx, undefined, {
      name: "submit",
    });
    return existingChangeRequest;
  }

  return ChangeRequest.createWithCtx(
    ctx,
    {
      teamId: document.teamId,
      documentId: null,
      draftDocumentId: document.id,
      baseRevisionId: null,
      status: ChangeRequestStatus.Submitted,
      submittedById: user.id,
      submittedAt: new Date(),
    },
    { name: "submit" }
  );
}
