import { Group, User, Team } from "@server/models";
import { AdminRequiredError } from "../errors";
import { allow } from "./cancan";

allow(User, "createGroup", Team, (actor, team) => {
  if (!team || actor.isViewer || actor.teamId !== team.id) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(User, "read", Group, (actor, group) => {
  // for the time being, we're going to let everyone on the team see every group
  // we may need to make this more granular in the future
  if (!group || actor.teamId !== group.teamId) {
    return false;
  }
  return true;
});

allow(User, ["update", "delete"], Group, (actor, group) => {
  if (!group || actor.isViewer || actor.teamId !== group.teamId) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});
