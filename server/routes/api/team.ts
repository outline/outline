import Router from "koa-router";
import teamUpdater from "@server/commands/teamUpdater";
import auth from "@server/middlewares/authentication";
import { Team, TeamDomain } from "@server/models";
import { authorize } from "@server/policies";
import { presentTeam, presentPolicies } from "@server/presenters";
import { assertUuid } from "@server/validation";

const router = new Router();

router.post("team.update", auth(), async (ctx) => {
  const {
    name,
    avatarUrl,
    subdomain,
    sharing,
    guestSignin,
    documentEmbeds,
    memberCollectionCreate,
    collaborativeEditing,
    defaultCollectionId,
    defaultUserRole,
    inviteRequired,
    allowedDomains,
  } = ctx.body;

  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId, {
    include: [{ model: TeamDomain }],
  });
  authorize(user, "update", team);

  if (defaultCollectionId !== undefined && defaultCollectionId !== null) {
    assertUuid(defaultCollectionId, "defaultCollectionId must be uuid");
  }

  const updatedTeam = await teamUpdater({
    params: {
      name,
      avatarUrl,
      subdomain,
      sharing,
      guestSignin,
      documentEmbeds,
      memberCollectionCreate,
      collaborativeEditing,
      defaultCollectionId,
      defaultUserRole,
      inviteRequired,
      allowedDomains,
    },
    user,
    team,
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentTeam(updatedTeam),
    policies: presentPolicies(user, [updatedTeam]),
  };
});

export default router;
