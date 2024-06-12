import Router from "koa-router";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { DataAttribute } from "@server/models";
import { authorize } from "@server/policies";
import { presentDataAttribute, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "dataAttributes.info",
  auth(),
  validate(T.DataAttributesInfoSchema),
  async (ctx: APIContext<T.DataAttributesInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const dataAttribute = await DataAttribute.findByPk(id, {
      rejectOnEmpty: true,
    });

    authorize(user, "read", dataAttribute);

    ctx.body = {
      data: presentDataAttribute(dataAttribute),
    };
  }
);

router.post(
  "dataAttributes.list",
  auth(),
  validate(T.DataAttributesListSchema),
  pagination(),
  async (ctx: APIContext<T.DataAttributesListReq>) => {
    const { sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;

    const dataAttributes = await DataAttribute.findAll({
      where: { teamId: user.teamId },
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      data: dataAttributes.map(presentDataAttribute),
    };
  }
);

router.post(
  "dataAttributes.create",
  auth({ role: UserRole.Admin }),
  validate(T.DataAttributesCreateSchema),
  transaction(),
  async (ctx: APIContext<T.DataAttributesCreateReq>) => {
    const { name, description, dataType, options, pinned } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const dataAttribute = await DataAttribute.create(
      {
        name,
        description,
        createdById: user.id,
        teamId: user.teamId,
        dataType,
        options,
        pinned,
      },
      { transaction }
    );

    ctx.body = {
      data: presentDataAttribute(dataAttribute),
      policies: presentPolicies(user, [dataAttribute]),
    };
  }
);

export default router;
