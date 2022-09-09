import Router from "koa-router";
import { isNil } from "lodash";
import teamUpdater from "@server/commands/teamUpdater";
import auth from "@server/middlewares/authentication";
import { Team, TeamDomain } from "@server/models";
import { TeamPreference } from "@server/models/Team";
import { authorize } from "@server/policies";
import { presentTeam, presentPolicies } from "@server/presenters";
import { DocumentStatus } from "@server/types";
import {
  assertUuid,
  assertKeysIn,
  assertIn,
  assertBoolean,
} from "@server/validation";

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
    preferences,
  } = ctx.body;

  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId, {
    include: [{ model: TeamDomain }],
  });
  authorize(user, "update", team);

  if (preferences) {
    assertKeysIn(preferences, TeamPreference);
    if (preferences.defaultDocumentStatus) {
      assertIn(
        preferences.defaultDocumentStatus,
        Object.values(DocumentStatus)
      );
    }

    if (!isNil(preferences.allowEditWithCollaborativeEditing)) {
      assertBoolean(preferences.allowEditWithCollaborativeEditing);
    }
  }

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
      preferences,
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
