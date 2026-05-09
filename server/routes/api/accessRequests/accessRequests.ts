import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, AccessRequest, UserMembership } from "@server/models";
import { AccessRequestStatus } from "@server/models/AccessRequest";
import { authorize, can } from "@server/policies";
import { presentAccessRequest, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";
import { InvalidRequestError, NotFoundError } from "@server/errors";

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

    const document = await Document.findByPk(documentId, {
      userId: user.id,
      transaction,
      rejectOnEmpty: true,
    });

    if (can(user, "read", document)) {
      throw InvalidRequestError("User already has document access");
    }
    if (user.teamId !== document.teamId) {
      throw NotFoundError();
    }

    const accessRequest = await AccessRequest.createWithCtx(ctx, {
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
      status: AccessRequestStatus.Pending,
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
  validate(T.AccessRequestsInfoSchema),
  async (ctx: APIContext<T.AccessRequestsInfoReq>) => {
    const { user } = ctx.state.auth;
    const { id, documentId } = ctx.input.body;
    let accessRequest: AccessRequest | null = null;

    if (id) {
      accessRequest = await AccessRequest.findByPk(id);
    } else if (documentId) {
      const document = await Document.findByPk(documentId);
      accessRequest = document
        ? await AccessRequest.findPendingForUser({
            documentId: document.id,
            userId: user.id,
          })
        : null;
    }
    if (!accessRequest) {
      throw NotFoundError("Access request not found");
    }
    authorize(user, "read", accessRequest);

    ctx.body = {
      data: presentAccessRequest(accessRequest),
      policies: presentPolicies(user, [accessRequest]),
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

    const accessRequest = await AccessRequest.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: AccessRequest },
    });
    authorize(user, "update", accessRequest);
    authorize(user, "read", accessRequest.user);

    if (accessRequest.status !== AccessRequestStatus.Pending) {
      throw InvalidRequestError("Access request has already been responded to");
    }

    const document = await Document.findByPk(accessRequest.documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "share", document);

    const membership = await UserMembership.findOne({
      where: {
        userId: accessRequest.userId,
        documentId: accessRequest.documentId,
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!membership) {
      await UserMembership.createWithCtx(ctx, {
        userId: accessRequest.userId,
        documentId: accessRequest.documentId,
        permission: permission,
        createdById: user.id,
      });
    }

    await accessRequest.approve(ctx);

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

    const accessRequest = await AccessRequest.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: AccessRequest },
    });
    authorize(user, "update", accessRequest);
    authorize(user, "read", accessRequest.user);

    const document = await Document.findByPk(accessRequest.documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "share", document);

    if (accessRequest.status === AccessRequestStatus.Pending) {
      await accessRequest.dismiss(ctx);
    }

    ctx.body = {
      data: presentAccessRequest(accessRequest),
      policies: presentPolicies(user, [accessRequest]),
    };
  }
);

export default router;
