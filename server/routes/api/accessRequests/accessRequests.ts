import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, AccessRequest, UserMembership, Event } from "@server/models";
import { AccessRequestStatus } from "@server/models/AccessRequest";
import { authorize } from "@server/policies";
import { presentAccessRequest, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";
import {
  DocumentPermissionPriority,
  getDocumentPermission,
} from "@server/utils/permissions";
import {
  AuthorizationError,
  InvalidRequestError,
  NotFoundError,
} from "@server/errors";

const router = new Router();

router.post(
  "accessRequests.create",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.AccessRequestsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.AccessRequestsCreateReq>) => {
    const { documentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const document = await Document.findByPk(documentId, { transaction });
    if (!document) {
      throw NotFoundError("Document could not be found");
    }

    const accessRequest = await AccessRequest.createWithCtx(ctx, {
      documentId: document.id,
      teamId: document.teamId,
      userId: user.id,
      status: AccessRequestStatus.Pending,
    });

    await Event.createFromContext(ctx, {
      name: "documents.request_access",
      documentId: document.id,
    });

    ctx.body = {
      data: presentAccessRequest(accessRequest),
      policies: presentPolicies(user, [accessRequest]),
    };
  }
);

router.post(
  "accessRequests.info",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.AccessRequestInfoSchema),
  async (ctx: APIContext<T.AccessRequestInfoReq>) => {
    const { user } = ctx.state.auth;
    const { id, documentId } = ctx.input.body;

    const accessReq = id
      ? await AccessRequest.findByPk(id)
      : await AccessRequest.pendingRequest({ documentId, userId: user.id });

    if (!accessReq) {
      return ctx.throw(404, "Access request not found");
    }
    authorize(user, "read", accessReq);

    ctx.body = {
      data: presentAccessRequest(accessReq),
      policies: presentPolicies(user, [accessReq]),
    };
  }
);

router.post(
  "accessRequests.approve",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.AccessRequestsApproveSchema),
  transaction(),
  async (ctx: APIContext<T.AccessRequestsApproveReq>) => {
    const { id, permission } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const accessRequest = await AccessRequest.unscoped().findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (accessRequest.status !== AccessRequestStatus.Pending) {
      throw InvalidRequestError("Access request has already been responded to");
    }

    const document = await Document.findByPk(accessRequest.documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "share", document);

    const adminPermission = await getDocumentPermission({
      userId: user.id,
      documentId: document.id,
    });
    if (
      !adminPermission ||
      DocumentPermissionPriority[permission] >
        DocumentPermissionPriority[adminPermission]
    ) {
      throw AuthorizationError();
    }

    accessRequest.status = AccessRequestStatus.Approved;
    accessRequest.responderId = user.id;
    accessRequest.respondedAt = new Date();
    await accessRequest.saveWithCtx(ctx, { transaction });

    await UserMembership.create(
      {
        userId: accessRequest.userId,
        documentId: accessRequest.documentId,
        permission: permission,
        createdById: user.id,
      },
      { transaction }
    );

    ctx.body = {
      data: presentAccessRequest(accessRequest),
      policies: presentPolicies(user, [accessRequest]),
    };
  }
);

router.post(
  "accessRequests.dismiss",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.AccessRequestsDismissSchema),
  transaction(),
  async (ctx: APIContext<T.AccessRequestsDismissReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const accessRequest = await AccessRequest.unscoped().findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (accessRequest.status !== AccessRequestStatus.Pending) {
      throw InvalidRequestError("Access request has already been responded to");
    }

    const document = await Document.findByPk(accessRequest.documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "share", document);

    accessRequest.status = AccessRequestStatus.Dismissed;
    accessRequest.responderId = user.id;
    accessRequest.respondedAt = new Date();
    await accessRequest.saveWithCtx(ctx, { transaction });

    ctx.body = {
      data: presentAccessRequest(accessRequest),
      policies: presentPolicies(user, [accessRequest]),
    };
  }
);

export default router;
