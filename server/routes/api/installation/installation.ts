import Router from "koa-router";
import { Client, UserRole } from "@shared/types";
import slugify from "@shared/utils/slugify";
import teamCreator from "@server/commands/teamCreator";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Team, User } from "@server/models";
import { APIContext } from "@server/types";
import { signIn } from "@server/utils/authentication";
import { getVersion, getVersionInfo } from "@server/utils/getInstallationInfo";
import * as T from "./schema";

// Note: This entire router is only mounted in self-hosted installations.
const router = new Router();

router.post(
  "installation.create",
  validate(T.InstallationCreateSchema),
  transaction(),
  async (ctx: APIContext<T.InstallationCreateSchemaReq>) => {
    const { teamName, userName, userEmail } = ctx.input.body;
    const { transaction } = ctx.state;

    // Check that this can only be called when there are no existing teams
    const existingTeamCount = await Team.count({ transaction });
    if (existingTeamCount > 0) {
      throw ValidationError("Installation already has existing teams");
    }

    const team = await teamCreator({
      name: teamName,
      subdomain: slugify(teamName),
      ip: ctx.request.ip,
      transaction,
      authenticationProviders: [],
    });

    const user = await User.create(
      {
        name: userName,
        email: userEmail,
        teamId: team.id,
        role: UserRole.Admin,
      },
      {
        transaction,
      }
    );

    await signIn(ctx, "email", {
      user,
      team,
      isNewTeam: true,
      isNewUser: true,
      client: Client.Web,
    });
  }
);

router.post("installation.info", auth(), async (ctx: APIContext) => {
  const currentVersion = getVersion();
  const { latestVersion, versionsBehind } =
    await getVersionInfo(currentVersion);

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
