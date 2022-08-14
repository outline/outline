import invariant from "invariant";
import Router from "koa-router";
import teamCreator from "@server/commands/teamCreator";
import teamUpdater from "@server/commands/teamUpdater";
import auth from "@server/middlewares/authentication";
import { Event, Team, TeamDomain, User } from "@server/models";
import { authorize } from "@server/policies";
import { presentTeam, presentPolicies } from "@server/presenters";
import { assertLength, assertUuid } from "@server/validation";

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

router.post("team.create", auth(), async (ctx) => {
  const { user } = ctx.state;
  const { name } = ctx.body;
  assertLength(name, 2, "Name must be 2 or more characters");

  const existingTeam = await Team.scope("withAuthenticationProviders").findByPk(
    user.teamId
  );

  const authenticationProviders = existingTeam?.authenticationProviders.map(
    (provider) => {
      return {
        name: provider.name,
        providerId: provider.providerId,
      };
    }
  );

  invariant(
    authenticationProviders?.length,
    "authentication provideers must exist"
  );

  const team = await teamCreator({
    name,
    subdomain: name,
    authenticationProviders,
    ip: ctx.ip,
  });

  const newUser = await User.create({
    teamId: team.id,
    name: user.name,
    email: user.email,
    service: null,
    isAdmin: true,
    avatarUrl: user.avatarUrl,
    invitedById: user.id,
  });

  Event.create({
    name: "users.create",
    actorId: user.id,
    userId: newUser.id,
    teamId: newUser.teamId,
    data: {
      name: newUser.name,
    },
    ip: ctx.ip,
  });

  ctx.body = {
    success: true,
    data: {
      team: presentTeam(team),
    },
  };
});

export default router;
