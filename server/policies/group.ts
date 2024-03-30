import { Group, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel } from "./utils";

allow(User, "createGroup", Team, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    actor.isAdmin
  )
);

allow(User, "listGroups", Team, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    !actor.isGuest
  )
);

allow(User, "read", Group, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    !actor.isGuest
  )
);

allow(User, ["update", "delete"], Group, (actor, group) =>
  and(
    //
    isTeamModel(actor, group),
    actor.isAdmin
  )
);
