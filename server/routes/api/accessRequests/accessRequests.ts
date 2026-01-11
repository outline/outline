import Router from "koa-router";
import { DocumentPermission } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, AccessRequest, UserMembership } from "@server/models";
import { AccessRequestStatus } from "@server/models/AccessRequest";
import { authorize } from "@server/policies";
import { presentAccessRequest, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";

const router = new Router();

router.post(
  "access_requests.info",
  auth(),
  validate(T.AccessRequestInfoSchema),
  async (ctx: APIContext<T.AccessRequestInfoReq>) => {
    const { user } = ctx.state.auth;
    const { id, documentSlug } = ctx.input.body;

    let accessReq: AccessRequest | null = null;
    if (id) {
      accessReq = await AccessRequest.findByPk(id);
    } else if (documentSlug) {
      const document = await Document.findByPk(documentSlug, {
        rejectOnEmpty: true,
      });

      accessReq = await AccessRequest.findOne({
        where: {
          documentId: document.id,
          userId: user.id,
        },
      });
    }

    if (!accessReq) {
      return ctx.throw(404, "Access request not found");
    }

    ctx.body = {
      data: presentAccessRequest(accessReq),
      policies: presentPolicies(user, [accessReq]),
    };
  }
);

router.post(
  "access_requests.approve",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.AccessRequestsApproveSchema),
  transaction(),
  async (ctx: APIContext<T.AccessRequestsApproveReq>) => {
    const { id, permission } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const accessRequest = await AccessRequest.findByPk(id, {
      rejectOnEmpty: true,
    });
    if (accessRequest.status !== AccessRequestStatus.Pending) {
      return ctx.throw(400, "Access request has already been responded to");
    }

    const document = await Document.findByPk(accessRequest.documentId, {
      userId: user.id,
    });
    authorize(user, "share", document);

    accessRequest.status = AccessRequestStatus.Approved;
    accessRequest.responderId = user.id;
    accessRequest.respondedAt = new Date();
    await accessRequest.save({ transaction });

    await UserMembership.create(
      {
        userId: accessRequest.userId,
        documentId: accessRequest.documentId,
        permission: permission || DocumentPermission.ReadWrite,
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
  "access_requests.dismiss",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.AccessRequestsDismissSchema),
  transaction(),
  async (ctx: APIContext<T.AccessRequestsDismissReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const accessRequest = await AccessRequest.findByPk(id, {
      rejectOnEmpty: true,
    });
    if (accessRequest.status !== AccessRequestStatus.Pending) {
      return ctx.throw(400, "Access request has already been responded to");
    }

    const document = await Document.findByPk(accessRequest.documentId, {
      userId: user.id,
    });
    authorize(user, "share", document);

    accessRequest.status = AccessRequestStatus.Dismissed;
    accessRequest.responderId = user.id;
    accessRequest.respondedAt = new Date();
    await accessRequest.save({ transaction });

    ctx.body = {
      data: presentAccessRequest(accessRequest),
      policies: presentPolicies(user, [accessRequest]),
    };
  }
);

export default router;
