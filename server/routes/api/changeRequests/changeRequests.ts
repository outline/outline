import Router from "koa-router";
import type { Includeable, WhereOptions } from "sequelize";
import { Op } from "sequelize";
import { ChangeRequestStatus } from "@shared/types";
import changeRequestApplier, {
  changeRequestRejecter,
  changeRequestWithdrawer,
} from "@server/commands/changeRequestApplier";
import changeRequestSubmitter from "@server/commands/changeRequestSubmitter";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import {
  ChangeRequest,
  Collection,
  Document,
  type User,
} from "@server/models";
import {
  isCollectionMaintainer,
  maintainedCollectionIdsForUser,
} from "@server/models/helpers/CollectionMaintainerHelper";
import { authorize } from "@server/policies";
import { presentChangeRequest, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";
import { NotFoundError } from "@server/errors";

const router = new Router();

const changeRequestIncludes: Includeable[] = [
  {
    association: "submittedBy",
    required: false,
  },
  {
    association: "reviewedBy",
    required: false,
  },
  {
    model: Document.scope("withDrafts"),
    as: "draftDocument",
    required: true,
  },
];

/**
 * Annotate a change request with maintainer policy context.
 *
 * @param user Acting user.
 * @param changeRequest Change request to annotate.
 * @param transaction Database transaction.
 */
async function annotateChangeRequestPolicies(
  user: User,
  changeRequest: ChangeRequest,
  transaction: APIContext["state"]["transaction"]
) {
  const collectionId = changeRequest.draftDocument?.collectionId;

  if (!collectionId) {
    changeRequest.isMaintainer = user.isAdmin;
    return;
  }

  const collection = await Collection.findByPk(collectionId, {
    transaction,
    rejectOnEmpty: true,
  });
  changeRequest.isMaintainer = await isCollectionMaintainer(
    user,
    collection,
    transaction
  );
}

router.post(
  "changeRequests.list",
  auth(),
  pagination(),
  validate(T.ChangeRequestsListSchema),
  async (ctx: APIContext<T.ChangeRequestsListReq>) => {
    const { status, collectionId, draftDocumentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const maintainedCollectionIds = user.isAdmin
      ? null
      : await maintainedCollectionIdsForUser(user);

    const filters: WhereOptions<ChangeRequest>[] = [
      {
        teamId: user.teamId,
      },
    ];

    if (status) {
      filters.push({ status });
    }

    if (draftDocumentId) {
      filters.push({ draftDocumentId });
    }

    if (collectionId) {
      filters.push({
        ["$draftDocument.collectionId$"]: collectionId,
      });
    }

    if (!user.isAdmin) {
      const visibilityFilters: WhereOptions<ChangeRequest>[] = [
        { submittedById: user.id },
      ];

      if (maintainedCollectionIds?.length) {
        visibilityFilters.push({
          ["$draftDocument.collectionId$"]: {
            [Op.in]: maintainedCollectionIds,
          },
        });
      }

      filters.push({
        [Op.or]: visibilityFilters,
      });
    }

    const changeRequests = await ChangeRequest.findAll({
      where: {
        [Op.and]: filters,
      },
      include: changeRequestIncludes,
      subQuery: false,
      order: [["submittedAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    await Promise.all(
      changeRequests.map((changeRequest) =>
        annotateChangeRequestPolicies(user, changeRequest)
      )
    );

    ctx.body = {
      pagination: ctx.state.pagination,
      data: changeRequests.map(presentChangeRequest),
      policies: presentPolicies(user, changeRequests),
    };
  }
);

router.post(
  "changeRequests.info",
  auth(),
  validate(T.ChangeRequestsInfoSchema),
  async (ctx: APIContext<T.ChangeRequestsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const changeRequest = await ChangeRequest.findByPk(id, {
      include: changeRequestIncludes,
    });

    if (!changeRequest) {
      throw NotFoundError();
    }

    await annotateChangeRequestPolicies(user, changeRequest);
    authorize(user, "read", changeRequest);

    ctx.body = {
      data: presentChangeRequest(changeRequest),
      policies: presentPolicies(user, [changeRequest]),
    };
  }
);

router.post(
  "changeRequests.submit",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.ChangeRequestsSubmitSchema),
  transaction(),
  async (ctx: APIContext<T.ChangeRequestsSubmitReq>) => {
    const { draftDocumentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const changeRequest = await changeRequestSubmitter(ctx, {
      draftDocumentId,
    });

    await changeRequest.reload({
      include: changeRequestIncludes,
      transaction: ctx.state.transaction,
    });
    await annotateChangeRequestPolicies(
      user,
      changeRequest,
      ctx.state.transaction
    );

    ctx.body = {
      data: presentChangeRequest(changeRequest),
      policies: presentPolicies(user, [changeRequest]),
    };
  }
);

router.post(
  "changeRequests.approve",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.ChangeRequestsApproveSchema),
  transaction(),
  async (ctx: APIContext<T.ChangeRequestsApproveReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const changeRequest = await ChangeRequest.findByPk(id, {
      include: changeRequestIncludes,
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: ChangeRequest },
      rejectOnEmpty: true,
    });

    await annotateChangeRequestPolicies(user, changeRequest, transaction);

    const approvedChangeRequest = await changeRequestApplier(ctx, {
      changeRequest,
      isMaintainer: !!changeRequest.isMaintainer,
    });

    await approvedChangeRequest.reload({
      include: changeRequestIncludes,
      transaction,
    });

    ctx.body = {
      data: presentChangeRequest(approvedChangeRequest),
      policies: presentPolicies(user, [approvedChangeRequest]),
    };
  }
);

router.post(
  "changeRequests.reject",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.ChangeRequestsRejectSchema),
  transaction(),
  async (ctx: APIContext<T.ChangeRequestsRejectReq>) => {
    const { id, reviewNote } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const changeRequest = await ChangeRequest.findByPk(id, {
      include: changeRequestIncludes,
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: ChangeRequest },
      rejectOnEmpty: true,
    });

    await annotateChangeRequestPolicies(user, changeRequest, transaction);

    const rejectedChangeRequest = await changeRequestRejecter(
      ctx,
      changeRequest,
      !!changeRequest.isMaintainer,
      reviewNote
    );

    await rejectedChangeRequest.reload({
      include: changeRequestIncludes,
      transaction,
    });

    ctx.body = {
      data: presentChangeRequest(rejectedChangeRequest),
      policies: presentPolicies(user, [rejectedChangeRequest]),
    };
  }
);

router.post(
  "changeRequests.withdraw",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.ChangeRequestsWithdrawSchema),
  transaction(),
  async (ctx: APIContext<T.ChangeRequestsWithdrawReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const changeRequest = await ChangeRequest.findByPk(id, {
      include: changeRequestIncludes,
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: ChangeRequest },
      rejectOnEmpty: true,
    });

    const withdrawnChangeRequest = await changeRequestWithdrawer(
      ctx,
      changeRequest
    );

    await withdrawnChangeRequest.reload({
      include: changeRequestIncludes,
      transaction,
    });
    await annotateChangeRequestPolicies(
      user,
      withdrawnChangeRequest,
      transaction
    );

    ctx.body = {
      data: presentChangeRequest(withdrawnChangeRequest),
      policies: presentPolicies(user, [withdrawnChangeRequest]),
    };
  }
);

export default router;
