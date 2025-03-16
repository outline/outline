import { Team, User } from "@server/models";
import { allow } from "./cancan";
import { and, isCloudHosted, isTeamAdmin, isTeamModel, or } from "./utils";

allow(User, "read", Team, isTeamModel);

allow(User, "share", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    !actor.isGuest,
    !actor.isViewer,
    !!team?.sharing
  )
);

allow(User, "createTeam", Team, (actor, team) =>
  and(
    //
    isCloudHosted(),
    !actor.isGuest,
    !actor.isViewer,
    or(actor.isAdmin, !!team?.memberTeamCreate)
  )
);

allow(User, "update", Team, isTeamAdmin);

allow(User, ["delete", "audit"], Team, (actor, team) =>
  and(
    //
    isCloudHosted(),
    isTeamAdmin(actor, team)
  )
);
