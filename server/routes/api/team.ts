import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { Event, Team } from "@server/models";
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
    collaborativeEditing,
    preferredCollectionId,
    defaultUserRole,
  } = ctx.body;
  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId);
  authorize(user, "update", team);

  if (subdomain !== undefined && process.env.SUBDOMAINS_ENABLED === "true") {
    team.subdomain = subdomain === "" ? null : subdomain;
  }

  if (name) {
    team.name = name;
  }
  if (sharing !== undefined) {
    team.sharing = sharing;
  }
  if (documentEmbeds !== undefined) {
    team.documentEmbeds = documentEmbeds;
  }
  if (guestSignin !== undefined) {
    team.guestSignin = guestSignin;
  }
  if (avatarUrl !== undefined) {
    team.avatarUrl = avatarUrl;
  }

  if (preferredCollectionId !== undefined) {
    if (preferredCollectionId !== null)
      assertUuid(preferredCollectionId, "preferredCollectionId must be uuid");
    team.preferredCollectionId = preferredCollectionId;
  }

  if (collaborativeEditing !== undefined) {
    team.collaborativeEditing = collaborativeEditing;
  }

  if (defaultUserRole !== undefined) {
    team.defaultUserRole = defaultUserRole;
  }

  const changes = team.changed();
  const data = {};
  await team.save();

  if (changes) {
    for (const change of changes) {
      data[change] = team[change];
    }

    await Event.create({
      name: "teams.update",
      actorId: user.id,
      teamId: user.teamId,
      data,
      ip: ctx.request.ip,
    });
  }

  ctx.body = {
    data: presentTeam(team),
    policies: presentPolicies(user, [team]),
  };
});

export default router;
