import { ApiKey, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isOwner, isTeamModel, isTeamMutable } from "./utils";

allow(User, "createApiKey", Team, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !actor.isViewer,
    !actor.isGuest,
    !actor.isSuspended
  )
);

allow(User, ["read", "update", "delete"], ApiKey, isOwner);
