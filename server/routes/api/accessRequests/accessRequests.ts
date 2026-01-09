import Router from "koa-router";
import { DocumentPermission } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import {
  Document,
  AccessRequest,
  UserMembership,
  Notification,
} from "@server/models";
import { AccessRequestStatus } from "@server/models/AccessRequest";
import { authorize } from "@server/policies";
import { presentAccessRequest, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";

const router = new Router();

/**
 * Default permission level to grant when approving an access request
 * if no specific permission is provided.
 */
const DEFAULT_APPROVED_PERMISSION = DocumentPermission.ReadWrite;

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
      const document = await Document.findByPk(documentSlug);
      accessReq = await AccessRequest.findOne({
        where: {
          documentId: document.id,
          userId: user.id,
        },
      });
    }

    authorize(user, "read", accessReq);
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
      transaction,
      rejectOnEmpty: true,
    });

    const document = await Document.findByPk(accessRequest.documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "share", document);

    // Check that the request is still pending
    if (accessRequest.status !== AccessRequestStatus.Pending) {
      ctx.throw(400, "Access request has already been responded to");
    }

    // Update the access request
    accessRequest.status = AccessRequestStatus.Approved;
    accessRequest.responderId = user.id;
    accessRequest.respondedAt = new Date();
    await accessRequest.save({ transaction });

    // Grant the user access to the document
    await UserMembership.create(
      {
        userId: accessRequest.userId,
        documentId: accessRequest.documentId,
        permission: permission || DEFAULT_APPROVED_PERMISSION,
        createdById: user.id,
      },
      { transaction }
    );

    // Mark all related notifications as read
    await Notification.update(
      { viewedAt: new Date() },
      {
        where: {
          accessRequestId: accessRequest.id,
          viewedAt: null,
        },
        transaction,
      }
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
      transaction,
      rejectOnEmpty: true,
    });

    const document = await Document.findByPk(accessRequest.documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "share", document);

    // Check that the request is still pending
    if (accessRequest.status !== AccessRequestStatus.Pending) {
      ctx.throw(400, "Access request has already been responded to");
    }

    // Update the access request
    accessRequest.status = AccessRequestStatus.Dismissed;
    accessRequest.responderId = user.id;
    accessRequest.respondedAt = new Date();
    await accessRequest.save({ transaction });

    // Mark all related notifications as read
    await Notification.update(
      { viewedAt: new Date() },
      {
        where: {
          accessRequestId: accessRequest.id,
          viewedAt: null,
        },
        transaction,
      }
    );

    ctx.body = {
      data: presentAccessRequest(accessRequest),
      policies: presentPolicies(user, [accessRequest]),
    };
  }
);

export default router;
