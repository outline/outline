import Router from "koa-router";
import type { WhereOptions } from "sequelize";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import {
  AuthenticationProvider,
  ExternalGroup,
  Group,
} from "@server/models";
import { authorize } from "@server/policies";
import { presentExternalGroup, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "externalGroups.list",
  auth({ role: UserRole.Admin }),
  validate(T.ExternalGroupsListSchema),
  pagination(),
  async (ctx: APIContext<T.ExternalGroupsListReq>) => {
    const { authenticationProviderId } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "read", user.team);

    const where: WhereOptions<ExternalGroup> = {
      teamId: user.teamId,
    };

    if (authenticationProviderId) {
      where.authenticationProviderId = authenticationProviderId;
    }

    const [externalGroups, total] = await Promise.all([
      ExternalGroup.findAll({
        where,
        include: [
          { model: Group, as: "group" },
          { model: AuthenticationProvider, as: "authenticationProvider" },
        ],
        order: [["name", "ASC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      ExternalGroup.count({ where }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: externalGroups.map(presentExternalGroup),
      policies: presentPolicies(user, externalGroups),
    };
  }
);

export default router;
