import { TeamPreference } from "@shared/types";
import { ApiKey, User, Team } from "@server/models";
import { allow } from "./cancan";
import {
  and,
  isCloudHosted,
  isOwner,
  isTeamModel,
  isTeamMutable,
  or,
} from "./utils";

allow(User, "createApiKey", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !actor.isViewer,
    !actor.isGuest,
    !actor.isSuspended,
    actor.isAdmin ||
      !!team?.getPreference(TeamPreference.MembersCanCreateApiKey)
  )
);

allow(User, "listApiKeys", Team, (actor, team) =>
  and(
    //
    isCloudHosted(),
    isTeamModel(actor, team),
    actor.isAdmin
  )
);

allow(User, ["read", "update", "delete"], ApiKey, (actor, apiKey) =>
  and(
    isTeamModel(actor, apiKey?.user),
    or(
      actor.isAdmin,
      and(
        isOwner(actor, apiKey),
        !!actor.team?.getPreference(TeamPreference.MembersCanCreateApiKey)
      )
    )
  )
);
