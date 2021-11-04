// @flow
import { AdminRequiredError } from "../errors";
import { Group, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "createGroup", Team, (actor, team) => {
  if (!team || actor.isViewer || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});

allow(User, "read", Group, (actor, group) => {
  // for the time being, we're going to let everyone see every group
  // we may need to make this more granular in the future
  return true;
});

allow(User, ["update", "delete"], Group, (actor, group) => {
  if (!group || actor.isViewer || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});
