import Router from "koa-router";
import accountProvisioner from "@server/commands/accountProvisioner";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Team } from "@server/models";
import { presentTeam, presentUser } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { getVersion, getVersionInfo } from "@server/utils/getInstallationInfo";
import * as T from "./schema";

const router = new Router();

router.post(
  "installation.create",
  rateLimiter(RateLimiterStrategy.FivePerHour),
  validate(T.InstallationCreateSchema),
  transaction(),
  async (ctx: APIContext<T.InstallationCreateSchemaReq>) => {
    const { transaction } = ctx.state;
    const { teamName, userName, userEmail } = ctx.input.body;

    // Check that this can only be called when there are no existing teams
    const existingTeamCount = await Team.count({ transaction });
    if (existingTeamCount > 0) {
      throw ValidationError("Installation already has existing teams");
    }

    // Use accountProvisioner to create the team
    const result = await accountProvisioner({
      ip: ctx.request.ip,
      user: {
        name: userName,
        email: userEmail,
      },
      team: {
        name: teamName,
        subdomain: teamName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      },
      authenticationProvider: {
        name: "email",
        providerId: "email",
      },
      authentication: {
        providerId: userEmail,
        scopes: [],
      },
    });

    ctx.body = {
      data: {
        user: presentUser(result.user),
        team: presentTeam(result.team),
        isNewTeam: result.isNewTeam,
        isNewUser: result.isNewUser,
      },
    };
  }
);

router.post("installation.info", auth(), async (ctx: APIContext) => {
  const currentVersion = getVersion();
  const { latestVersion, versionsBehind } = await getVersionInfo(
    currentVersion
  );

  ctx.body = {
    data: {
      version: currentVersion,
      latestVersion,
      versionsBehind,
    },
    policies: [],
  };
});

export default router;
